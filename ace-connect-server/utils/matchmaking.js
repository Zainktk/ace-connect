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
    // 1. NTRP compatibility (70% weight)
    const reqMin = parseFloat(request.skill_level_min);
    const reqMax = parseFloat(request.skill_level_max);
    const playerRating = parseFloat(player.ntrp_rating);

    let ntrpScore = 0;
    if (!isNaN(reqMin) && !isNaN(reqMax) && !isNaN(playerRating)) {
        const avgRequestRating = (reqMin + reqMax) / 2;
        ntrpScore = calculateNTRPCompatibility(avgRequestRating, playerRating);
    }

    // 2. Location compatibility (20% weight) - COORDINATE ONLY
    let locationScore = 0;

    // Convert to numbers and validate
    const reqLat = parseFloat(request.latitude);
    const reqLng = parseFloat(request.longitude);
    const playerLat = parseFloat(player.latitude);
    const playerLng = parseFloat(player.longitude);

    if (reqLat && reqLng && playerLat && playerLng) {
        const R = 6371; // Earth radius in km
        const dLat = (playerLat - reqLat) * Math.PI / 180;
        const dLon = (playerLng - reqLng) * Math.PI / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(reqLat * Math.PI / 180) * Math.cos(playerLat * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;

        // Exact scoring based on distance
        if (distance <= 2) locationScore = 100;
        else if (distance <= 5) locationScore = 90;
        else if (distance <= 10) locationScore = 70;
        else if (distance <= 20) locationScore = 40;
        else if (distance <= 50) locationScore = 10;
        else locationScore = 0;
    }

    // 3. Availability score (10% weight) - EXACT MATCH ONLY
    let availabilityScore = 0;
    if (request.preferred_time && player.preferred_time && request.preferred_time === player.preferred_time) {
        availabilityScore = 100;
    }

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
