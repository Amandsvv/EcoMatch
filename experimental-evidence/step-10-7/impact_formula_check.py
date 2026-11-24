import sys
import math
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
MS2_PATH = PROJECT_ROOT / "ms2-agent-service"
sys.path.insert(0, str(MS2_PATH))

from app.agents.verification import (
    _node_compute_co2e_avoided,
    _node_compute_dollars_saved,
)
from app.reference_data.categories import EMISSION_FACTORS

categories = list(EMISSION_FACTORS.keys())

print("EcoMatch Impact Calculation Validation")
print("=" * 65)
print("Volume: 1.0 metric ton/month")
print("Disposal cost: 50 per unit")
print("Frequency: monthly")
print("=" * 65)

passed = 0
failed = 0

for category in categories:
    state = {
        "primary_category": category,
        "volume_tons_per_month": 1.0,
        "disposal_cost_per_unit": 50.0,
        "disposal_frequency": "monthly",
    }

    actual_co2 = _node_compute_co2e_avoided(state)["co2e_avoided_kg"]
    actual_savings = _node_compute_dollars_saved(state)["dollars_saved"]

    factor = EMISSION_FACTORS[category]["co2e_per_ton"]
    expected_co2 = round(1.0 * 12 * factor * 1000, 2)
    expected_savings = round(50.0 * 1.0 * 12, 2)

    co2_ok = math.isclose(actual_co2, expected_co2, abs_tol=0.001)
    savings_ok = math.isclose(actual_savings, expected_savings, abs_tol=0.001)

    status = "PASS" if co2_ok and savings_ok else "FAIL"

    print(f"\nCategory: {category}")
    print(f"CO2e actual: {actual_co2} | Expected: {expected_co2}")
    print(f"Savings actual: {actual_savings} | Expected: {expected_savings}")
    print(f"Result: {status}")

    if status == "PASS":
        passed += 1
    else:
        failed += 1

print("\n" + "=" * 65)
print(f"Categories tested: {len(categories)}")
print(f"Passed: {passed}")
print(f"Failed: {failed}")
print(f"Formula consistency: {passed}/{len(categories)}")

# Test unknown category fallback
unknown_state = {
    "primary_category": "unknown_category",
    "volume_tons_per_month": 1.0,
    "disposal_cost_per_unit": 50.0,
    "disposal_frequency": "monthly",
}

unknown_result = _node_compute_co2e_avoided(unknown_state)
print(f"\nUnknown category CO2e fallback: {unknown_result['co2e_avoided_kg']}")

if failed:
    sys.exit(1)


