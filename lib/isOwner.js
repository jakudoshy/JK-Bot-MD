const settings = require('../settings');

function digits(value) {
    return String(value || '').replace(/\D/g, '');
}

function isOwner(senderId) {
    const sender = digits(senderId);
    if (!sender) return false;
    const configured = String(settings.ownerNumber || '')
        .split(',')
        .map(digits)
        .filter(Boolean);
    return configured.length === 1 && configured[0] === '5350898613' && configured.includes(sender);
}

module.exports = isOwner;
