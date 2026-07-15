# Reference data for EcoMatch agents
# Categories and compatibility rules (single source of truth)

CATEGORIES = {
    "organic_biomass": {
        "description": "Food scraps, spent grain, coffee grounds, vegetable waste",
        "compatible_business_types": ["compost_operation", "mushroom_farm", "biogas_plant", "animal_feed_processor"],
        "market_price_per_unit": 80,  # $ per ton reference price
    },
    "cardboard_paper": {
        "description": "Packaging, offcuts, office paper, cardboard boxes",
        "compatible_business_types": ["recycling_center", "paper_mill", "packaging_manufacturer"],
        "market_price_per_unit": 45,
    },
    "used_cooking_oil": {
        "description": "Restaurant/kitchen waste oil, deep fryer oil",
        "compatible_business_types": ["biodiesel_producer", "soap_manufacturer", "rendering_plant"],
        "market_price_per_unit": 120,
    },
    "textile_offcuts": {
        "description": "Fabric scraps, textile waste, fibers",
        "compatible_business_types": ["textile_recycler", "fiber_processor", "waste_cloth_buyer"],
        "market_price_per_unit": 90,
    },
    "wood_pallets_untreated": {
        "description": "Wooden pallets, untreated crating, wooden offcuts",
        "compatible_business_types": ["pallet_manufacturer", "wood_recycler", "furniture_maker", "biomass_energy"],
        "market_price_per_unit": 60,
    },
    "packaging_plastic": {
        "description": "Clean, non-food-contaminated plastic packaging, films",
        "compatible_business_types": ["plastic_recycler", "plastic_manufacturer", "packaging_processor"],
        "market_price_per_unit": 70,
    },
}

# Emission factors (EPA WARM model v16, simplified)
EMISSION_FACTORS = {
    "organic_biomass": {
        "methodology": "EPA WARM v16 - Organic Waste Composting",
        "co2e_per_ton": 0.5,  # kg CO2e avoided per ton diverted
        "notes": "Assumes composting vs. landfill baseline"
    },
    "cardboard_paper": {
        "methodology": "EPA WARM v16 - Paper Recycling",
        "co2e_per_ton": 1.8,
        "notes": "Assumes recycling vs. virgin production"
    },
    "used_cooking_oil": {
        "methodology": "EPA WARM v16 - Used Oil Recycling",
        "co2e_per_ton": 2.2,
        "notes": "Assumes biodiesel production"
    },
    "textile_offcuts": {
        "methodology": "EPA WARM v16 - Textile Recycling",
        "co2e_per_ton": 1.5,
        "notes": "Assumes fiber recovery"
    },
    "wood_pallets_untreated": {
        "methodology": "EPA WARM v16 - Wood Reuse/Recycling",
        "co2e_per_ton": 1.2,
        "notes": "Assumes reuse or energy recovery"
    },
    "packaging_plastic": {
        "methodology": "EPA WARM v16 - Plastic Recycling",
        "co2e_per_ton": 2.1,
        "notes": "Assumes virgin plastic displacement"
    },
}

def get_category(category_name: str) -> dict | None:
    """Get category details by name."""
    return CATEGORIES.get(category_name)

def get_all_categories() -> list[str]:
    """Get all valid category names."""
    return list(CATEGORIES.keys())

def is_valid_category(category_name: str) -> bool:
    """Check if category is valid."""
    return category_name in CATEGORIES

def get_compatible_business_types(category_name: str) -> list[str]:
    """Get compatible business types for a category."""
    category = get_category(category_name)
    if category:
        return category["compatible_business_types"]
    return []

def get_market_price(category_name: str) -> float:
    """Get reference market price for a category."""
    category = get_category(category_name)
    if category:
        return category["market_price_per_unit"]
    return 0.0

def get_emission_factor(category_name: str) -> dict | None:
    """Get emission factor for a category."""
    return EMISSION_FACTORS.get(category_name)
