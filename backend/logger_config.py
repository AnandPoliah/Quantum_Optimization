"""
Centralized logging configuration for the Quantum Route Optimization backend.
"""
import logging
import sys
from pathlib import Path

# Configure logging format
LOG_FORMAT = '[%(levelname)s]:%(asctime)s-%(name)s-%(funcName)s:%(lineno)d-%(message)s'
DATE_FORMAT = '%Y-%m-%d %H:%M:%S'

# Create formatter
formatter = logging.Formatter(LOG_FORMAT, DATE_FORMAT)

# Configure root logger
root_logger = logging.getLogger()
root_logger.setLevel(logging.INFO)

# Console handler (stdout)
console_handler = logging.StreamHandler(sys.stdout)
console_handler.setLevel(logging.INFO)
console_handler.setFormatter(formatter)

# Add handler to root logger (only if not already added)
if not root_logger.handlers:
    root_logger.addHandler(console_handler)


def get_logger(name: str) -> logging.Logger:
    """
    Get a logger instance with the specified name.
    
    Args:
        name: Usually __name__ from the calling module
        
    Returns:
        logging.Logger: Configured logger instance
    """
    return logging.getLogger(name)


# Silence noisy third-party loggers
logging.getLogger("motor").setLevel(logging.WARNING)
logging.getLogger("pymongo").setLevel(logging.WARNING)
logging.getLogger("asyncio").setLevel(logging.WARNING)
logging.getLogger("urllib3").setLevel(logging.WARNING)
