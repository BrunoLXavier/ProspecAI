"""
AI Model Management System
Implements versioned local model deployment with registry and pipeline caching
Supports BERTimbau models for LGPD NER with gradual rollout capabilities
"""
import asyncio
import json
import logging
import os
import threading
import time
from abc import ABC, abstractmethod
from dataclasses import asdict, dataclass
from datetime import datetime, timedelta
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union
from uuid import UUID, uuid4

# Heavy ML libs (torch, transformers) are imported lazily inside methods
# to avoid importing them at module import time which can cause OOM
# during migrations or tooling that imports the package.


logger = logging.getLogger(__name__)


class ModelStatus(Enum):
    """Model deployment status"""
    PENDING = "pending"
    DOWNLOADING = "downloading"
    LOADING = "loading"
    READY = "ready"
    ERROR = "error"
    DEPRECATED = "deprecated"


class ModelTask(Enum):
    """Supported model tasks"""
    NER = "ner"
    TEXT_CLASSIFICATION = "text-classification"
    QUESTION_ANSWERING = "question-answering"
    FEATURE_EXTRACTION = "feature-extraction"


@dataclass
class ModelConfig:
    """Model configuration with versioning"""
    id: str
    name: str
    version: str
    task: ModelTask
    path: str
    device: str = "auto"
    max_length: int = 512
    batch_size: int = 8
    cache_size: int = 1000
    model_class: str = "AutoModelForTokenClassification"
    tokenizer_class: str = "AutoTokenizer"
    pipeline_kwargs: Dict[str, Any] = None
    metadata: Dict[str, Any] = None
    
    def __post_init__(self):
        if self.pipeline_kwargs is None:
            self.pipeline_kwargs = {}
        if self.metadata is None:
            self.metadata = {}


@dataclass
class ModelMetrics:
    """Model performance metrics"""
    model_id: str
    total_inferences: int = 0
    avg_inference_time_ms: float = 0.0
    success_rate: float = 1.0
    last_used: Optional[datetime] = None
    memory_usage_mb: float = 0.0
    cache_hit_rate: float = 0.0


@dataclass
class DeploymentConfig:
    """Model deployment configuration"""
    model_id: str
    rollout_percentage: float = 100.0
    target_groups: List[str] = None
    feature_flags: Dict[str, bool] = None
    health_check_interval: timedelta = timedelta(minutes=5)
    
    def __post_init__(self):
        if self.target_groups is None:
            self.target_groups = ["all"]
        if self.feature_flags is None:
            self.feature_flags = {}


class ModelRegistry:
    """
    Model registry with versioning and deployment management
    Tracks model versions, deployments, and performance metrics
    """
    
    def __init__(self, registry_path: str = "./registry"):
        self.registry_path = Path(registry_path)
        self.registry_path.mkdir(exist_ok=True)
        
        self._models: Dict[str, ModelConfig] = {}
        self._deployments: Dict[str, DeploymentConfig] = {}
        self._metrics: Dict[str, ModelMetrics] = {}
        self._lock = threading.Lock()
        
        self._load_registry()
    
    def register_model(self, config: ModelConfig) -> bool:
        """Register a new model version"""
        try:
            with self._lock:
                self._models[config.id] = config
                
                # Initialize metrics
                self._metrics[config.id] = ModelMetrics(model_id=config.id)
                
                # Save to disk
                self._save_registry()
                
                logger.info(f"Registered model {config.name} v{config.version} ({config.id})")
                return True
                
        except Exception as e:
            logger.error(f"Failed to register model {config.id}: {e}")
            return False
    
    def get_model(self, model_id: str) -> Optional[ModelConfig]:
        """Get model configuration by ID"""
        return self._models.get(model_id)
    
    def list_models(self, task: Optional[ModelTask] = None) -> List[ModelConfig]:
        """List all registered models, optionally filtered by task"""
        models = list(self._models.values())
        if task:
            models = [m for m in models if m.task == task]
        return models
    
    def get_active_model(self, name: str, task: ModelTask) -> Optional[ModelConfig]:
        """Get the active model for a given name and task"""
        # Find the latest version that's deployed
        candidates = [
            m for m in self._models.values()
            if m.name == name and m.task == task
        ]
        
        if not candidates:
            return None
        
        # Sort by version (assuming semantic versioning)
        candidates.sort(key=lambda x: x.version, reverse=True)
        
        # Return first deployed model
        for model in candidates:
            deployment = self._deployments.get(model.id)
            if deployment and deployment.rollout_percentage > 0:
                return model
        
        return None
    
    def deploy_model(self, model_id: str, config: DeploymentConfig) -> bool:
        """Deploy a model with specific configuration"""
        try:
            if model_id not in self._models:
                raise ValueError(f"Model {model_id} not registered")
            
            with self._lock:
                self._deployments[model_id] = config
                self._save_registry()
                
                logger.info(
                    f"Deployed model {model_id} with {config.rollout_percentage}% rollout"
                )
                return True
                
        except Exception as e:
            logger.error(f"Failed to deploy model {model_id}: {e}")
            return False
    
    def update_metrics(self, model_id: str, metrics: ModelMetrics) -> None:
        """Update model performance metrics"""
        with self._lock:
            self._metrics[model_id] = metrics
    
    def get_metrics(self, model_id: str) -> Optional[ModelMetrics]:
        """Get model performance metrics"""
        return self._metrics.get(model_id)
    
    def _load_registry(self) -> None:
        """Load registry from disk"""
        try:
            registry_file = self.registry_path / "registry.json"
            if registry_file.exists():
                with open(registry_file) as f:
                    data = json.load(f)
                
                # Load models
                for model_data in data.get("models", []):
                    config = ModelConfig(**model_data)
                    self._models[config.id] = config
                
                # Load deployments
                for dep_data in data.get("deployments", []):
                    deployment = DeploymentConfig(**dep_data)
                    self._deployments[deployment.model_id] = deployment
                
                # Load metrics
                for metric_data in data.get("metrics", []):
                    metrics = ModelMetrics(**metric_data)
                    self._metrics[metrics.model_id] = metrics
                
                logger.info(f"Loaded {len(self._models)} models from registry")
                
        except Exception as e:
            logger.warning(f"Could not load registry: {e}")
    
    def _save_registry(self) -> None:
        """Save registry to disk"""
        try:
            registry_file = self.registry_path / "registry.json"
            data = {
                "models": [asdict(config) for config in self._models.values()],
                "deployments": [asdict(config) for config in self._deployments.values()],
                "metrics": [asdict(metrics) for metrics in self._metrics.values()],
                "updated_at": datetime.now().isoformat()
            }
            
            with open(registry_file, 'w') as f:
                json.dump(data, f, indent=2, default=str)
                
        except Exception as e:
            logger.error(f"Failed to save registry: {e}")


class ModelManager:
    """
    Production-ready model manager with versioning and performance optimization
    Supports local deployment of BERTimbau and other transformer models
    """
    
    def __init__(
        self, 
        models_dir: str = "./models",
        registry_path: str = "./registry",
        enable_caching: bool = True
    ):
        self.models_dir = Path(models_dir)
        self.models_dir.mkdir(exist_ok=True)
        
        self.registry = ModelRegistry(registry_path)
        self.enable_caching = enable_caching
        
        # Loaded model pipelines cache
        self._pipelines: Dict[str, Pipeline] = {}
        self._pipeline_lock = threading.Lock()
        
        # Device management (detect lazily)
        self.device = None
        logger.info("ModelManager initialized (device detection deferred)")
        
        # Performance tracking
        self._inference_times: Dict[str, List[float]] = {}
        
        # Initialize default models
        self._register_default_models()
    
    def _detect_device(self) -> str:
        """Auto-detect optimal device for inference"""
        try:
            import torch
        except Exception:
            return "cpu"

        try:
            if torch.cuda.is_available():
                return f"cuda:{torch.cuda.current_device()}"
            elif hasattr(torch.backends, 'mps') and torch.backends.mps.is_available():
                return "mps"
        except Exception:
            # In constrained environments, probing device can fail; fallback to CPU
            return "cpu"

        return "cpu"
    
    def _register_default_models(self) -> None:
        """Register default BERTimbau models"""
        # Base Portuguese BERT
        bertimbau_base = ModelConfig(
            id="bertimbau-base-v1",
            name="bertimbau-base",
            version="1.0.0",
            task=ModelTask.NER,
            path="bertimbau/bert-base-portuguese-cased",
            model_class="AutoModelForTokenClassification",
            tokenizer_class="AutoTokenizer",
            pipeline_kwargs={
                "aggregation_strategy": "simple",
                "stride": 16
            },
            metadata={
                "description": "BERTimbau Base Portuguese for NER",
                "language": "pt-BR",
                "training_data": "Portuguese corpus",
                "accuracy": 0.89,
                "use_case": "General Portuguese NER"
            }
        )
        
        # Legal/LGPD specialized model
        lgpd_model = ModelConfig(
            id="lgpd-ner-v1",
            name="lgpd-ner",
            version="1.0.0", 
            task=ModelTask.NER,
            path="bertimbau/lgpd-ner-portuguese",
            model_class="AutoModelForTokenClassification",
            tokenizer_class="AutoTokenizer",
            pipeline_kwargs={
                "aggregation_strategy": "max",
                "stride": 16,
                "ignore_labels": ["O"]
            },
            metadata={
                "description": "Specialized LGPD PII detection for Portuguese",
                "language": "pt-BR",
                "training_data": "LGPD annotated corpus",
                "accuracy": 0.94,
                "precision": 0.92,
                "recall": 0.96,
                "use_case": "LGPD compliance and PII detection"
            }
        )
        
        self.registry.register_model(bertimbau_base)
        self.registry.register_model(lgpd_model)
        
        # Deploy with gradual rollout
        self.registry.deploy_model("bertimbau-base-v1", DeploymentConfig(
            model_id="bertimbau-base-v1",
            rollout_percentage=100.0,
            target_groups=["general", "development"]
        ))
        
        self.registry.deploy_model("lgpd-ner-v1", DeploymentConfig(
            model_id="lgpd-ner-v1", 
            rollout_percentage=100.0,
            target_groups=["lgpd", "production"]
        ))
    
    async def load_model(self, model_id: str) -> Any:
        """
        Load and cache a model pipeline with performance optimization
        
        Args:
            model_id: Model ID from registry
            
        Returns:
            Loaded pipeline
        """
        with self._pipeline_lock:
            # Check if already loaded
            if model_id in self._pipelines:
                return self._pipelines[model_id]
            
            # Get model configuration
            config = self.registry.get_model(model_id)
            if not config:
                raise ValueError(f"Model {model_id} not found in registry")
            
            try:
                start_time = time.time()
                logger.info(f"Loading model {config.name} v{config.version}...")
                
                model_path = self.models_dir / config.path

                # Determine device (detect if not already set)
                if self.device is None:
                    self.device = self._detect_device()
                device = config.device if config.device != "auto" else self.device

                # Lazy import heavy libraries
                try:
                    import torch
                except Exception as e:
                    raise RuntimeError("torch is required to load models") from e

                try:
                    import transformers as _transformers
                except Exception as e:
                    raise RuntimeError("transformers is required to load models") from e

                # Load tokenizer and model via transformers
                tokenizer_cls = getattr(_transformers, config.tokenizer_class)
                tokenizer = tokenizer_cls.from_pretrained(
                    str(model_path),
                    local_files_only=True,
                    cache_dir=str(self.models_dir / "cache")
                )

                model_cls = getattr(_transformers, config.model_class)
                model = model_cls.from_pretrained(
                    str(model_path),
                    local_files_only=True,
                    cache_dir=str(self.models_dir / "cache")
                )

                # Move to device
                try:
                    if device != "cpu":
                        model.to(device)
                except Exception:
                    # ignore device move failures and continue on cpu
                    pass
                
                # Create pipeline (lazy import of pipeline function)
                pipe = _transformers.pipeline(
                    config.task.value,
                    model=model,
                    tokenizer=tokenizer,
                    device=0 if isinstance(device, str) and device.startswith("cuda") else -1,
                    batch_size=config.batch_size,
                    max_length=config.max_length,
                    **config.pipeline_kwargs
                )
                
                # Cache pipeline
                self._pipelines[model_id] = pipe
                
                load_time = time.time() - start_time
                logger.info(
                    f"Model {config.name} loaded successfully in {load_time:.2f}s on {device}"
                )
                
                # Update metrics
                metrics = self.registry.get_metrics(model_id) or ModelMetrics(model_id=model_id)
                metrics.memory_usage_mb = self._estimate_memory_usage(model)
                self.registry.update_metrics(model_id, metrics)
                
                return pipe
                
            except Exception as e:
                logger.error(f"Failed to load model {model_id}: {e}")
                raise
    
    async def get_model_for_task(
        self, 
        task: ModelTask,
        model_name: Optional[str] = None
    ) -> Pipeline:
        """
        Get the best available model for a specific task
        
        Args:
            task: Model task type
            model_name: Specific model name (optional)
            
        Returns:
            Loaded pipeline
        """
        if model_name:
            # Get specific model
            config = self.registry.get_active_model(model_name, task)
        else:
            # Get best model for task
            models = self.registry.list_models(task)
            if not models:
                raise ValueError(f"No models available for task {task.value}")
            
            # Sort by accuracy if available in metadata
            models.sort(
                key=lambda m: m.metadata.get("accuracy", 0),
                reverse=True
            )
            config = models[0]
        
        if not config:
            raise ValueError(f"No active model found for task {task.value}")
        
        return await self.load_model(config.id)
    
    async def inference(
        self,
        model_id: str,
        inputs: Union[str, List[str]],
        **kwargs
    ) -> Any:
        """
        Run inference with performance tracking
        
        Args:
            model_id: Model ID
            inputs: Input text or list of texts
            **kwargs: Additional pipeline arguments
            
        Returns:
            Model predictions
        """
        start_time = time.time()
        
        try:
            # Load pipeline
            pipeline = await self.load_model(model_id)
            
            # Run inference
            results = pipeline(inputs, **kwargs)
            
            # Track performance
            inference_time = time.time() - start_time
            self._track_inference(model_id, inference_time, success=True)
            
            return results
            
        except Exception as e:
            # Track failure
            inference_time = time.time() - start_time
            self._track_inference(model_id, inference_time, success=False)
            logger.error(f"Inference failed for model {model_id}: {e}")
            raise
    
    async def preload_models(self, model_ids: Optional[List[str]] = None) -> None:
        """
        Preload models for faster inference
        
        Args:
            model_ids: List of model IDs to preload (all if None)
        """
        if model_ids is None:
            # Preload all deployed models
            model_ids = []
            for model_id, deployment in self.registry._deployments.items():
                if deployment.rollout_percentage > 0:
                    model_ids.append(model_id)
        
        logger.info(f"Preloading {len(model_ids)} models...")
        
        # Load models in parallel (but limit concurrency)
        semaphore = asyncio.Semaphore(2)  # Max 2 models loading simultaneously
        
        async def load_single(model_id: str):
            async with semaphore:
                try:
                    await self.load_model(model_id)
                    logger.info(f"Preloaded model {model_id}")
                except Exception as e:
                    logger.error(f"Failed to preload model {model_id}: {e}")
        
        await asyncio.gather(*[load_single(mid) for mid in model_ids], return_exceptions=True)
        logger.info("Model preloading completed")
    
    def get_model_stats(self) -> Dict[str, Any]:
        """Get comprehensive model statistics"""
        stats = {
            "loaded_models": len(self._pipelines),
            "registered_models": len(self.registry._models),
            "active_deployments": len([
                d for d in self.registry._deployments.values() 
                if d.rollout_percentage > 0
            ]),
            "device": self.device,
            "models": {}
        }
        
        # Add per-model stats
        for model_id, metrics in self.registry._metrics.items():
            config = self.registry.get_model(model_id)
            if config:
                stats["models"][model_id] = {
                    "name": config.name,
                    "version": config.version,
                    "task": config.task.value,
                    "loaded": model_id in self._pipelines,
                    "total_inferences": metrics.total_inferences,
                    "avg_inference_time_ms": metrics.avg_inference_time_ms,
                    "success_rate": metrics.success_rate,
                    "memory_usage_mb": metrics.memory_usage_mb,
                    "last_used": metrics.last_used
                }
        
        return stats
    
    def _track_inference(self, model_id: str, inference_time: float, success: bool) -> None:
        """Track inference performance metrics"""
        if model_id not in self._inference_times:
            self._inference_times[model_id] = []
        
        # Track time in milliseconds
        self._inference_times[model_id].append(inference_time * 1000)
        
        # Keep only last 1000 inferences
        if len(self._inference_times[model_id]) > 1000:
            self._inference_times[model_id] = self._inference_times[model_id][-1000:]
        
        # Update metrics
        metrics = self.registry.get_metrics(model_id)
        if metrics:
            metrics.total_inferences += 1
            metrics.avg_inference_time_ms = sum(self._inference_times[model_id]) / len(self._inference_times[model_id])
            
            if success:
                current_success = metrics.success_rate * (metrics.total_inferences - 1)
                metrics.success_rate = (current_success + 1) / metrics.total_inferences
            else:
                current_success = metrics.success_rate * (metrics.total_inferences - 1)
                metrics.success_rate = current_success / metrics.total_inferences
                
            metrics.last_used = datetime.now()
            
            self.registry.update_metrics(model_id, metrics)
    
    def _estimate_memory_usage(self, model) -> float:
        """Estimate model memory usage in MB"""
        try:
            total_params = sum(p.numel() for p in model.parameters())
            # Rough estimation: 4 bytes per parameter (float32)
            memory_mb = (total_params * 4) / (1024 * 1024)
            return memory_mb
        except:
            return 0.0


# Global model manager instance
_model_manager: Optional[ModelManager] = None


async def get_model_manager() -> ModelManager:
    """Get global model manager instance"""
    global _model_manager
    
    if _model_manager is None:
        models_dir = os.getenv("MODEL_CACHE_DIR", "./models")
        registry_path = os.getenv("MODEL_REGISTRY_PATH", "./registry")
        
        _model_manager = ModelManager(
            models_dir=models_dir,
            registry_path=registry_path,
            enable_caching=True
        )
        # Preload critical models unless SKIP_AI_MODELS is set
        if os.environ.get("SKIP_AI_MODELS") != "1":
            try:
                await _model_manager.preload_models()
            except Exception as e:
                logger.warning(f"Preloading models failed or skipped: {e}")
    
    return _model_manager


async def initialize_models() -> ModelManager:
    """Initialize model manager during application startup"""
    manager = await get_model_manager()
    logger.info("Model manager initialized successfully")
    return manager