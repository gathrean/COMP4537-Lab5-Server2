class dbResponder {
    constructor() {
        this.setupServer();
    }

    setupServer() {
        // Assuming you are using Express for simplicity
        const express = require('express');
        const bodyParser = require('body-parser');
        const app = express();

        // Middleware for parsing JSON and URL-encoded data
        app.use(bodyParser.json());
        app.use(bodyParser.urlencoded({ extended: true }));

        // Define routes
        app.post('/insert', this.handleInsert.bind(this));
        app.all('/query', this.handleQuery.bind(this));

        // Start the server
        const port = 3000; // Choose a suitable port
        app.listen(port, () => {
            console.log(`Server2 listening at http://localhost:${port}`);
        });
    }

    handleInsert(req, res) {
        const data = req.body.data;
        // Perform insertion logic here
        // ...

        // Send a response back to Server1
        res.status(200).send('Insertion successful');
    }

    handleQuery(req, res) {
        const query = req.method === 'GET' ? req.query.query : req.body.query;
        // Perform query logic here
        // ...

        // Send a response back to Server1
        res.status(200).send('Query result');
    }
}

// Instantiate Server2
new dbResponder();
