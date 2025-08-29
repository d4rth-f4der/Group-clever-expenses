const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            unique: true
        },
        members: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
                required: true
            }
        ],
        admin: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        }
    },
    { timestamps: true }
);

// Indexes to speed up membership and admin lookups
groupSchema.index({ members: 1 });
groupSchema.index({ admin: 1 });

const Group = mongoose.model('Group', groupSchema);

module.exports = Group;