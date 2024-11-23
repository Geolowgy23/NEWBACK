// controllers/paymentController.js
const axios = require('axios');

exports.createPaymentLink = async (req, res) => {
    const { data } = req.body;
    const { amount } = data.attributes;
    if (!amount) return res.status(400).send('Amount is required');

    try {
        const response = await axios.post('https://api.paymongo.com/v1/links', {
            data: {
                attributes: {
                    amount: amount * 1,
                    description: "Payment for Order",
                    remarks: "none"
                }
            }
        }, {
            headers: {
                'accept': 'application/json',
                'authorization': `Basic ${Buffer.from('sk_test_qktYNDx5UjE2gznY1es6vnba').toString('base64')}`,
                'content-type': 'application/json'
            }
        });

        res.json(response.data);
    } catch (error) {
        res.status(500).json({ message: 'Payment link creation failed' });
    }
};
