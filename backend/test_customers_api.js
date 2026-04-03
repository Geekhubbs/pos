const axios = require('axios');
(async () => {
    try {
        const res = await axios.post('http://localhost:5000/api/customers', {
            name: "Test Customer",
            phone: "123",
            email: "a@b.com",
            address: "123",
            loyalty_points: 0
        });
        console.log("SUCCESS:", res.data);
    } catch (err) {
        if (err.response) {
            console.error("HTTP ERROR:", err.response.status, err.response.data);
        } else {
            console.error("NETWORK ERROR:", err.message);
        }
    }
})();
