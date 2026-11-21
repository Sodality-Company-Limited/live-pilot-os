"""Evaluation modules for Soda OS ML models and safety gates."""
import os

_alt_eval = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "eval"))
if os.path.isdir(_alt_eval) and _alt_eval not in __path__:
    __path__.append(_alt_eval)
