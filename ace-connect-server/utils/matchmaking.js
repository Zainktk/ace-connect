/**
 * Matchmaking algorithm utilities
 */

/**
 * Calculate compatibility score between two players based on NTRP rating
 * @param {number} rating1 - First player's NTRP rating
 * @param {number} rating2 - Second player's NTRP rating
 * @returns {number} - Compatibility score (0-100)
 */
function calculateNTRPCompatibility(rating1, rating2) {
    if (!rating1 || !rating2) return 0;

    const difference = Math.abs(rating1 - rating2);

    if (difference === 0) return 100;
    if (difference <= 0.5) return 70;
    if (difference <= 1.0) return 40;
    return 0;
}

/**
 * Calculate overall match compatibility score
 * @param {object} request - Match request object
 * @param {object} player - Player profile object
 * @returns {number} - Overall compatibility score (0-100)
 */
function calculateMatchScore(request, player) {
    // NTRP compatibility (70% weight)
    const ntrpScore = calculateNTRPCompatibility(
        (request.skill_level_min + request.skill_level_max) / 2,
        player.ntrp_rating
    );

    // Location compatibility (20% weight) - simplified for now
    let locationScore = 50; // Default medium score
    if (request.location && player.location) {
        // Exact match
        if (request.location.toLowerCase() === player.location.toLowerCase()) {
            locationScore = 100;
        }
        // Partial match (same city/state)
        else if (request.location.toLowerCase().includes(player.location.toLowerCase()) ||
            player.location.toLowerCase().includes(request.location.toLowerCase())) {
            locationScore = 70;
        }
    }

    // Availability score (10% weight) - simplified for now
    const availabilityScore = 70; // Default good score

    // Calculate weighted average
    const totalScore = (ntrpScore * 0.7) + (locationScore * 0.2) + (availabilityScore * 0.1);

    return Math.round(totalScore);
}

/**
 * Check if a player's NTRP rating falls within request's skill range
 * @param {object} request - Match request object
 * @param {number} playerRating - Player's NTRP rating
 * @returns {boolean}
 */
function isWithinSkillRange(request, playerRating) {
    if (!playerRating) return false;
    if (!request.skill_level_min && !request.skill_level_max) return true;

    const min = request.skill_level_min || 1.0;
    const max = request.skill_level_max || 7.0;

    return playerRating >= min && playerRating <= max;
}

module.exports = {
    calculateNTRPCompatibility,
    calculateMatchScore,
    isWithinSkillRange
};
