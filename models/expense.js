const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema(
    {
        description: {
            type: String,
            required: true,
            trim: true
        },
        amount: {
            type: Number, // for future: change to Decimal128 or use only integers (eg all in cents)
            required: true,
            min: 0.01
        },
        group: {
            type: mongoose.SchemaTypes.ObjectId,
            ref: 'Group',
            required: true,
        }, payer: {
            type: mongoose.SchemaTypes.ObjectId,
            ref: 'User',
            required: true
        }, participants: [
            {
                user: {
                    type: mongoose.SchemaTypes.ObjectId,
                    ref: 'User',
                    required: true
                }
            }
        ],
        date: {
            type: Date,
            default: Date.now
        }
    },
    { timestamps: true }
);

// Helpful indexes for common access patterns
expenseSchema.index({ group: 1, date: -1, _id: -1 });
expenseSchema.index({ payer: 1, date: -1 });
expenseSchema.index({ 'participants.user': 1 });
expenseSchema.index({ createdAt: -1 });

const Expense = mongoose.model('Expense', expenseSchema);

module.exports = Expense;