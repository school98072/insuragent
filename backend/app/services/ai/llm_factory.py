import os
from typing import Type, Any, Tuple, Dict, List, Optional
from pydantic import BaseModel
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import HumanMessage
from langchain_core.callbacks import BaseCallbackHandler
from app.core.config import settings
from app.utils.logger import get_logger

logger = get_logger(__name__)

class FallbackAuditCallback(BaseCallbackHandler):
    """企业级熔断可观测性监视器：用于审计生产环境中运行时的限流(429)与厂商宕机事件"""
    def __init__(self, primary: str, backup: str):
        self.primary = primary
        self.backup = backup

    def on_llm_error(self, error: Exception, **kwargs: Any) -> Any:
        # 当主模型发生网络超时、429限流或500错误时，精准捕获并报警
        logger.error(
            f"[CIRCUIT BREAKER DETECTED] 主供应商 [{self.primary.upper()}] 遭遇运行时异常: {error}. "
            f"LangChain 正在执行熔断控制，无缝切流至后备多活网关 [{self.backup.upper()}]..."
        )

def _instantiate_llm(provider: str, model_name: str, dynamic_keys: Optional[Dict[str, str]] = None, enable_search: bool = False) -> BaseChatModel:
    """统一的基础模型实例生成器，支持传入 dynamic_keys 进行密钥透传，未传则降级读取本地 settings"""
    if provider == "anthropic":
        from langchain_anthropic import ChatAnthropic
        api_key = (dynamic_keys or {}).get("ANTHROPIC_API_KEY") or settings.ANTHROPIC_API_KEY or os.environ.get("ANTHROPIC_API_KEY")
        if not api_key:
            raise ValueError("ANTHROPIC_API_KEY 未设置")
        return ChatAnthropic(model=model_name, anthropic_api_key=str(api_key).strip(), temperature=0.0)
        
    elif provider == "gemini":
        from langchain_google_genai import ChatGoogleGenerativeAI
        api_key = (dynamic_keys or {}).get("GEMINI_API_KEY") or settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY 未设置")
        
        model_kwargs = {}
        if enable_search:
            model_kwargs["tools"] = [{"google_search": {}}]
            
        return ChatGoogleGenerativeAI(
            model=model_name,
            google_api_key=str(api_key).strip(),
            temperature=0.0,
            model_kwargs=model_kwargs
        )
        
    raise ValueError(f"不支持的供应商: {provider}")

def get_llm(model_name: str = None, dynamic_keys: Optional[Dict[str, str]] = None, enable_search: bool = False) -> Tuple[BaseChatModel, str]:
    """
    启动级防呆工厂（用于无图拓扑的轻量级调用）
    """
    provider = settings.LLM_PROVIDER.lower()
    target_model = model_name or settings.DEFAULT_LLM_MODEL
    
    try:
        return _instantiate_llm(provider, target_model, dynamic_keys, enable_search), provider
    except ValueError as e:
        logger.warning(f"主供应商 '{provider}' 初始化失败: {e}. 正在执行启动级自适应降级...")
        fallback_provider = "gemini" if provider == "anthropic" else "anthropic"
        fallback_model = settings.DEFAULT_LLM_MODEL if provider == "anthropic" else settings.CLAUSE_AGENT_MODEL
        return _instantiate_llm(fallback_provider, fallback_model, dynamic_keys, enable_search), fallback_provider

def get_structured_llm(
    schema: Type[BaseModel],
    model_name: str = None,
    dynamic_keys: Optional[Dict[str, str]] = None
) -> Tuple[Any, str]:
    """
    企业级高可用结构化模型工厂：支持运行时限流/超时自动无缝跨厂商熔断切换。
    返回 (集成了HA和结构化输出的隐式执行链, 主供应商名称)。
    """
    # 优先使用显式指定的模型型号，否则读取全局默认
    target_model = model_name or settings.DEFAULT_LLM_MODEL
    
    # 1. 动态判断本次调用的主供应商
    if "claude" in target_model.lower() or "haiku" in target_model.lower():
        primary_provider = "anthropic"
        backup_provider = "gemini"
        backup_model = settings.DECISION_AGENT_MODEL # 读取我们在 .env 中精心编排的后备型号
    else:
        primary_provider = "gemini"
        backup_provider = "anthropic"
        backup_model = settings.CLAUSE_AGENT_MODEL

    # 2. Robustly instantiate physical models (do not crash if only one is configured)
    primary_llm = None
    backup_llm = None
    
    try:
        primary_llm = _instantiate_llm(primary_provider, target_model, dynamic_keys)
    except ValueError as e:
        logger.info(f"[LLM Factory] Primary model '{primary_provider}' initialization skipped: {e}")
        
    try:
        backup_llm = _instantiate_llm(backup_provider, backup_model, dynamic_keys)
    except ValueError as e:
        logger.info(f"[LLM Factory] Backup model '{backup_provider}' initialization skipped: {e}")
        
    if not primary_llm and not backup_llm:
        raise ValueError(
            f"Neither primary model ({primary_provider}) nor backup model ({backup_provider}) "
            f"could be initialized. Please configure at least one API key (GEMINI_API_KEY or ANTHROPIC_API_KEY)."
        )
        
    # 3. Build dynamic HA fallback logic
    if primary_llm and backup_llm:
        audit_callback = FallbackAuditCallback(primary=primary_provider, backup=backup_provider)
        primary_llm.callbacks = [audit_callback]
        backup_llm.callbacks = [audit_callback]
        ha_llm = primary_llm.with_fallbacks(
            fallbacks=[backup_llm],
            exceptions_to_handle=(Exception,)
        )
        active_provider = primary_provider
    elif primary_llm:
        ha_llm = primary_llm
        active_provider = primary_provider
    else:
        ha_llm = backup_llm
        active_provider = backup_provider
        
    return ha_llm.with_structured_output(schema), active_provider

def format_multimodal_message(prompt: str, image_base64: str) -> HumanMessage:
    """
    多模态消息抽象器：彻底抹平跨厂商对 Base64 图片传参的格式鸿沟。
    LangChain 底层已全面抹平多模态 Payload，无需传入 provider 进行 if-else 判断。
    """
    message_content = [
        {"type": "text", "text": prompt},
        {
            "type": "image_url",
            "image_url": {
                "url": f"data:image/jpeg;base64,{image_base64}"
            }
        }
    ]
    return HumanMessage(content=message_content)
