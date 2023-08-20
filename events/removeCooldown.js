const APICountModals = require('../events/modals/apiCount.js');

async function checkExpiredCooldown() {
    const currentTime = new Date();

    try {
        const expiredCooldownData = await APICountModals.find({
            expirationDate: { $lt: currentTime }
        });

        for (const cooldownData of expiredCooldownData) {
            await APICountModals.deleteOne({ _id: cooldownData._id }).then(() => {
                console.log(`Expired cooldown data for user deleted.`);
            }).catch(error => {
                console.error(`Error while deleting expired cooldown data for user with ID ${cooldownData.userId}: ${error}`);
            });
        }
        
    } catch (error) {
        console.error(`Error while fetching expired cooldown data: ${error}`);
    }
}

module.exports = { checkExpiredCooldown }