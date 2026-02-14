/**
 * Rank and Ship Type Normalization Utility
 *
 * Handles fuzzy matching and normalization of maritime ranks and ship types
 * to account for various naming conventions used in job postings.
 *
 * Examples:
 * - "3/O", "3Off", "3rd Officer", "Third Officer" → "3rd Officer"
 * - "3E", "3/E", "3 Engr", "3rd Engr" → "3rd Engineer"
 * - "Aframax Tanker", "Aframax", "Afra" → "Oil Tanker"
 */

import { Rank, ShipType } from '../types';

/**
 * Rank normalization mapping
 * Maps common variants to standard Rank enum values
 */
const RANK_NORMALIZATIONS: Record<string, Rank> = {
  // Master
  'MASTER': Rank.MASTER,
  'CAPTAIN': Rank.MASTER,
  'CAPT': Rank.MASTER,
  'CAPTN': Rank.MASTER,
  'MASTER MARINER': Rank.MASTER,

  // Chief Officer
  'CHIEF OFFICER': Rank.CHIEF_OFFICER,
  'C/O': Rank.CHIEF_OFFICER,
  'CO': Rank.CHIEF_OFFICER,
  'CHIEF MATE': Rank.CHIEF_OFFICER,
  'C/M': Rank.CHIEF_OFFICER,
  'FIRST MATE': Rank.CHIEF_OFFICER,
  '1ST MATE': Rank.CHIEF_OFFICER,
  'CH.OFFICER': Rank.CHIEF_OFFICER,

  // 2nd Officer
  '2ND OFFICER': Rank.SECOND_OFFICER,
  '2/O': Rank.SECOND_OFFICER,
  '2O': Rank.SECOND_OFFICER,
  '2OFF': Rank.SECOND_OFFICER,
  '2 OFF': Rank.SECOND_OFFICER,
  'SECOND OFFICER': Rank.SECOND_OFFICER,
  '2ND MATE': Rank.SECOND_OFFICER,
  '2/M': Rank.SECOND_OFFICER,
  'SECOND MATE': Rank.SECOND_OFFICER,

  // 3rd Officer
  '3RD OFFICER': Rank.THIRD_OFFICER,
  '3/O': Rank.THIRD_OFFICER,
  '3O': Rank.THIRD_OFFICER,
  '3OFF': Rank.THIRD_OFFICER,
  '3 OFF': Rank.THIRD_OFFICER,
  'THIRD OFFICER': Rank.THIRD_OFFICER,
  '3RD MATE': Rank.THIRD_OFFICER,
  '3/M': Rank.THIRD_OFFICER,
  'THIRD MATE': Rank.THIRD_OFFICER,

  // Chief Engineer
  'CHIEF ENGINEER': Rank.CHIEF_ENGINEER,
  'C/E': Rank.CHIEF_ENGINEER,
  'CE': Rank.CHIEF_ENGINEER,
  'CH.ENGINEER': Rank.CHIEF_ENGINEER,
  'CHIEF ENGR': Rank.CHIEF_ENGINEER,
  'CH ENGR': Rank.CHIEF_ENGINEER,
  'CH ENG': Rank.CHIEF_ENGINEER,

  // 2nd Engineer
  '2ND ENGINEER': Rank.SECOND_ENGINEER,
  '2/E': Rank.SECOND_ENGINEER,
  '2E': Rank.SECOND_ENGINEER,
  '2 ENGR': Rank.SECOND_ENGINEER,
  '2ND ENGR': Rank.SECOND_ENGINEER,
  'SECOND ENGINEER': Rank.SECOND_ENGINEER,
  'SECOND ENGR': Rank.SECOND_ENGINEER,
  '2 ENG': Rank.SECOND_ENGINEER,
  '2ND ENG': Rank.SECOND_ENGINEER,

  // 3rd Engineer
  '3RD ENGINEER': Rank.THIRD_ENGINEER,
  '3/E': Rank.THIRD_ENGINEER,
  '3E': Rank.THIRD_ENGINEER,
  '3 ENGR': Rank.THIRD_ENGINEER,
  '3RD ENGR': Rank.THIRD_ENGINEER,
  'THIRD ENGINEER': Rank.THIRD_ENGINEER,
  'THIRD ENGR': Rank.THIRD_ENGINEER,
  '3 ENG': Rank.THIRD_ENGINEER,
  '3RD ENG': Rank.THIRD_ENGINEER,

  // 4th Engineer
  '4TH ENGINEER': Rank.FOURTH_ENGINEER,
  '4/E': Rank.FOURTH_ENGINEER,
  '4E': Rank.FOURTH_ENGINEER,
  '4 ENGR': Rank.FOURTH_ENGINEER,
  '4TH ENGR': Rank.FOURTH_ENGINEER,
  'FOURTH ENGINEER': Rank.FOURTH_ENGINEER,
  'FOURTH ENGR': Rank.FOURTH_ENGINEER,
  '4 ENG': Rank.FOURTH_ENGINEER,
  '4TH ENG': Rank.FOURTH_ENGINEER,

  // Electro Technical Officer
  'ELECTRO TECHNICAL OFFICER': Rank.ELECTRO_TECHNICAL_OFFICER,
  'ETO': Rank.ELECTRO_TECHNICAL_OFFICER,
  'E.T.O': Rank.ELECTRO_TECHNICAL_OFFICER,
  'ELECTRICAL OFFICER': Rank.ELECTRO_TECHNICAL_OFFICER,
  'ELECTRICIAN': Rank.ELECTRO_TECHNICAL_OFFICER,

  // Bosun
  'BOSUN': Rank.BOSUN,
  "BO'SUN": Rank.BOSUN,
  'BOATSWAIN': Rank.BOSUN,
  'BOSN': Rank.BOSUN,

  // Able Seaman
  'ABLE SEAMAN': Rank.ABLE_SEAMAN,
  'AB': Rank.ABLE_SEAMAN,
  'A.B': Rank.ABLE_SEAMAN,
  'A/B': Rank.ABLE_SEAMAN,
  'ABLE BODIED SEAMAN': Rank.ABLE_SEAMAN,

  // Oiler
  'OILER': Rank.OILER,
  'OILMAN': Rank.OILER,
  'GREASER': Rank.OILER,

  // Fitter
  'FITTER': Rank.FITTER,
  'ENGINE FITTER': Rank.FITTER,
  'MOTOR MAN': Rank.FITTER,
  'MOTORMAN': Rank.FITTER,

  // Cook
  'COOK': Rank.COOK,
  'CHIEF COOK': Rank.COOK,
  'CH.COOK': Rank.COOK,

  // Steward
  'STEWARD': Rank.STEWARD,
  'CHIEF STEWARD': Rank.STEWARD,
  'GENERAL STEWARD': Rank.STEWARD,
  'GSU': Rank.STEWARD,

  // Ordinary Seaman
  'ORDINARY SEAMAN': Rank.ORDINARY_SEAMAN,
  'O.S': Rank.ORDINARY_SEAMAN,
  'OS': Rank.ORDINARY_SEAMAN,
  'O/S': Rank.ORDINARY_SEAMAN,

  // Deck Cadet
  'DECK CADET': Rank.DECK_CADET,
  'CADET': Rank.DECK_CADET,
  'D.C': Rank.DECK_CADET,

  // Engine Cadet
  'ENGINE CADET': Rank.ENGINE_CADET,
  'E.C': Rank.ENGINE_CADET,
  'ENGINEER CADET': Rank.ENGINE_CADET,

  // Pumpman
  'PUMPMAN': Rank.PUMPMAN,
  'P/M': Rank.PUMPMAN,
  'PUMP MAN': Rank.PUMPMAN,
};

/**
 * Ship Type normalization mapping
 * Maps common variants to standard ShipType enum values
 */
const SHIP_TYPE_NORMALIZATIONS: Record<string, ShipType> = {
  // Oil Tanker
  'OIL TANKER': ShipType.OIL_TANKER,
  'TANKER': ShipType.OIL_TANKER,
  'CRUDE OIL TANKER': ShipType.OIL_TANKER,
  'CRUDE TANKER': ShipType.OIL_TANKER,
  'CRUDE': ShipType.OIL_TANKER,
  'VLCC': ShipType.OIL_TANKER,
  'AFRAMAX': ShipType.OIL_TANKER,
  'AFRAMAX TANKER': ShipType.OIL_TANKER,
  'AFRA': ShipType.OIL_TANKER,
  'SUEZMAX': ShipType.OIL_TANKER,
  'SUEZMAX TANKER': ShipType.OIL_TANKER,
  'PANAMAX TANKER': ShipType.OIL_TANKER,
  'PANAMAX': ShipType.OIL_TANKER,
  'HANDYSIZE TANKER': ShipType.OIL_TANKER,
  'PRODUCT TANKER': ShipType.OIL_TANKER,

  // Chemical Tanker
  'CHEMICAL TANKER': ShipType.CHEMICAL_TANKER,
  'CHEM TANKER': ShipType.CHEMICAL_TANKER,
  'CHEMICAL': ShipType.CHEMICAL_TANKER,
  'PARCEL TANKER': ShipType.CHEMICAL_TANKER,

  // LNG Carrier
  'LNG CARRIER': ShipType.LNG_CARRIER,
  'LNG': ShipType.LNG_CARRIER,
  'LNG TANKER': ShipType.LNG_CARRIER,
  'LIQUEFIED NATURAL GAS': ShipType.LNG_CARRIER,

  // LPG Carrier
  'LPG CARRIER': ShipType.LPG_CARRIER,
  'LPG': ShipType.LPG_CARRIER,
  'LPG TANKER': ShipType.LPG_CARRIER,
  'LIQUEFIED PETROLEUM GAS': ShipType.LPG_CARRIER,
  'GAS CARRIER': ShipType.LPG_CARRIER,

  // Bulk Carrier
  'BULK CARRIER': ShipType.BULK_CARRIER,
  'BULKER': ShipType.BULK_CARRIER,
  'BULK': ShipType.BULK_CARRIER,
  'DRY BULK': ShipType.BULK_CARRIER,
  'DRY BULK CARRIER': ShipType.BULK_CARRIER,
  'HANDYMAX': ShipType.BULK_CARRIER,
  'HANDYMAX BULKER': ShipType.BULK_CARRIER,
  'SUPRAMAX': ShipType.BULK_CARRIER,
  'SUPRAMAX BULKER': ShipType.BULK_CARRIER,
  'PANAMAX BULKER': ShipType.BULK_CARRIER,
  'CAPESIZE': ShipType.BULK_CARRIER,
  'CAPESIZE BULKER': ShipType.BULK_CARRIER,

  // Container
  'CONTAINER': ShipType.CONTAINER,
  'CONTAINER SHIP': ShipType.CONTAINER,
  'CONTAINERSHIP': ShipType.CONTAINER,
  'FEEDER': ShipType.CONTAINER,
  'FEEDER CONTAINER': ShipType.CONTAINER,
  'CONTAINER VESSEL': ShipType.CONTAINER,

  // General Cargo
  'GENERAL CARGO': ShipType.GENERAL_CARGO,
  'GENERAL CARGO SHIP': ShipType.GENERAL_CARGO,
  'CARGO': ShipType.GENERAL_CARGO,
  'CARGO SHIP': ShipType.GENERAL_CARGO,
  'MULTI-PURPOSE': ShipType.GENERAL_CARGO,
  'MULTIPURPOSE': ShipType.GENERAL_CARGO,
  'MPP': ShipType.GENERAL_CARGO,

  // RoRo
  'RORO': ShipType.RORO,
  'RO-RO': ShipType.RORO,
  'RO/RO': ShipType.RORO,
  'ROLL ON ROLL OFF': ShipType.RORO,
  'PCTC': ShipType.RORO,
  'CAR CARRIER': ShipType.RORO,

  // Offshore
  'OFFSHORE': ShipType.OFFSHORE,
  'OSV': ShipType.OFFSHORE,
  'OFFSHORE SUPPORT VESSEL': ShipType.OFFSHORE,
  'AHTS': ShipType.OFFSHORE,
  'ANCHOR HANDLING': ShipType.OFFSHORE,
  'PSV': ShipType.OFFSHORE,
  'PLATFORM SUPPLY VESSEL': ShipType.OFFSHORE,
  'CREW BOAT': ShipType.OFFSHORE,

  // Cruise Ship
  'CRUISE SHIP': ShipType.CRUISE_SHIP,
  'CRUISE': ShipType.CRUISE_SHIP,
  'PASSENGER SHIP': ShipType.CRUISE_SHIP,
  'PASSENGER': ShipType.CRUISE_SHIP,

  // Dredger
  'DREDGER': ShipType.DREDGER,
  'DREDGE': ShipType.DREDGER,
  'HOPPER DREDGER': ShipType.DREDGER,

  // Tug
  'TUG': ShipType.TUG,
  'TUGBOAT': ShipType.TUG,
  'TUG BOAT': ShipType.TUG,
};

/**
 * Normalize a rank string to standard Rank enum value
 *
 * @param rankInput Raw rank string from job posting
 * @returns Normalized Rank enum value or Rank.OTHER if no match
 */
export function normalizeRank(rankInput: string | Rank): Rank {
  // If already a valid Rank enum, return as-is
  if (Object.values(Rank).includes(rankInput as Rank)) {
    return rankInput as Rank;
  }

  // Normalize input: uppercase, trim, remove extra spaces
  const normalized = rankInput
    .toString()
    .toUpperCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\./g, ''); // Remove periods (e.g., "C.O" → "CO")

  // Direct match
  if (RANK_NORMALIZATIONS[normalized]) {
    return RANK_NORMALIZATIONS[normalized];
  }

  // Try partial match (e.g., "2nd Officer (Deck)" → "2nd Officer")
  for (const [pattern, rank] of Object.entries(RANK_NORMALIZATIONS)) {
    if (normalized.includes(pattern)) {
      return rank;
    }
  }

  // No match found
  return Rank.OTHER;
}

/**
 * Normalize a ship type string to standard ShipType enum value
 *
 * @param shipTypeInput Raw ship type string from job posting
 * @returns Normalized ShipType enum value or ShipType.OTHER if no match
 */
export function normalizeShipType(shipTypeInput: string | ShipType): ShipType {
  // If already a valid ShipType enum, return as-is
  if (Object.values(ShipType).includes(shipTypeInput as ShipType)) {
    return shipTypeInput as ShipType;
  }

  // Normalize input: uppercase, trim, remove extra spaces
  const normalized = shipTypeInput
    .toString()
    .toUpperCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/-/g, ' '); // Replace hyphens with spaces

  // Direct match
  if (SHIP_TYPE_NORMALIZATIONS[normalized]) {
    return SHIP_TYPE_NORMALIZATIONS[normalized];
  }

  // Try partial match (e.g., "Aframax Crude Oil Tanker" → "Oil Tanker")
  for (const [pattern, shipType] of Object.entries(SHIP_TYPE_NORMALIZATIONS)) {
    if (normalized.includes(pattern)) {
      return shipType;
    }
  }

  // No match found
  return ShipType.OTHER;
}

/**
 * Check if a job rank matches a filter rank (with fuzzy matching)
 *
 * @param jobRank Rank from job posting
 * @param filterRank User's selected filter rank
 * @returns true if ranks match (accounting for variants)
 */
export function matchesRankFilter(jobRank: string | Rank, filterRank: string | Rank): boolean {
  if (filterRank === 'All') return true;

  const normalizedJobRank = normalizeRank(jobRank);
  const normalizedFilterRank = normalizeRank(filterRank);

  return normalizedJobRank === normalizedFilterRank;
}

/**
 * Check if a job ship type matches a filter ship type (with fuzzy matching)
 *
 * @param jobShipType Ship type from job posting
 * @param filterShipType User's selected filter ship type
 * @returns true if ship types match (accounting for variants)
 */
export function matchesShipTypeFilter(
  jobShipType: string | ShipType,
  filterShipType: string | ShipType
): boolean {
  if (filterShipType === 'All') return true;

  const normalizedJobShipType = normalizeShipType(jobShipType);
  const normalizedFilterShipType = normalizeShipType(filterShipType);

  return normalizedJobShipType === normalizedFilterShipType;
}

/**
 * Get all possible rank variants for a given standard rank
 *
 * @param rank Standard rank enum value
 * @returns Array of rank variants (for display/suggestions)
 */
export function getRankVariants(rank: Rank): string[] {
  const variants: string[] = [rank]; // Include the standard name

  for (const [variant, normalizedRank] of Object.entries(RANK_NORMALIZATIONS)) {
    if (normalizedRank === rank && !variants.includes(variant)) {
      variants.push(variant);
    }
  }

  return variants;
}

/**
 * Get all possible ship type variants for a given standard ship type
 *
 * @param shipType Standard ship type enum value
 * @returns Array of ship type variants (for display/suggestions)
 */
export function getShipTypeVariants(shipType: ShipType): string[] {
  const variants: string[] = [shipType]; // Include the standard name

  for (const [variant, normalizedShipType] of Object.entries(SHIP_TYPE_NORMALIZATIONS)) {
    if (normalizedShipType === shipType && !variants.includes(variant)) {
      variants.push(variant);
    }
  }

  return variants;
}
