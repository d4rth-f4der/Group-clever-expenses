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

const Expense = mongoose.model('Expense', expenseSchema);

module.exports = Expense;