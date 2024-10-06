const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const port = process.env.PORT || 5000;

// middlewares
app.use(cors());
app.use(express.json());


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.byauspy.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        const projectsCollection = client.db("crmDb").collection("projects");
        const customersCollection = client.db("crmDb").collection("customers");
        const departmentsCollection = client.db("crmDb").collection("departments");
        const designationsCollection = client.db("crmDb").collection("designations");

        await customersCollection.createIndex(
            { name: 1 },
            { unique: true, name: "name" }
        );
        await departmentsCollection.createIndex(
            { department_name: 1 },
            { unique: true, name: "department_name" }
        );
        await designationsCollection.createIndex(
            { designation: 1 },
            { unique: true, name: "designation" }
        );



        // insert a project
        app.post("/projects", async (req, res) => {
            const projects = req.body;
            const result = await projectsCollection.insertOne(projects);
            res.send(result);
        });

        // New API for exporting all projects without pagination
        app.get("/projects/all", async (req, res) => {
            try {
                const projects = await projectsCollection.find().toArray();
                res.send(projects);
            } catch (error) {
                console.error(error);
                res.status(500).send({ error: "Failed to fetch all projects" });
            }
        });

        // Get 1st 10 customers with pagination
        app.get("/projects", async (req, res) => {
            try {
                // Default to page 1
                const page = parseInt(req.query.page) || 1;
                const limit = parseInt(req.query.limit) || 10;
                // Default to 10 items per page
                const skip = (page - 1) * limit;

                const total = await projectsCollection.countDocuments();
                const projects = await projectsCollection.find().skip(skip).limit(limit).toArray();

                res.send({
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit),
                    projects,
                });
            } catch (error) {
                console.error(error);
                res.status(500).send({ error: "Failed to fetch customers" });
            }
        });
        // update a projects
        app.patch('/projects/:id', async (req, res) => {
            const item = req.body;
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updatedProject = {
                $set: {
                    project_name: item.project_name,
                    customer_name: item.customer_name,
                    project_category: item.project_category,
                    department: item.department,
                    hod: item.hod,
                    pm: item.pm,
                    year: item.year,
                    phase: item.phase,
                    project_code: item.project_code
                }
            }

            const result = await projectsCollection.updateOne(filter, updatedProject)
            res.send(result);
        });

        // import projects functionality
        app.post('/projects/all', async (req, res) => {
            try {
                // This should be an array of customer objects
                const projects = req.body;

                // Ensure projects is an array
                if (!Array.isArray(projects) || projects.length === 0) {
                    return res.status(400).send({ error: 'Expected an array of projects' });
                }

                const result = await projectsCollection.insertMany(projects, { ordered: false });

                res.send({ success: true, insertedCount: result.insertedCount });
            } catch (error) {
                console.error(error);
                res.status(500).send({ error: 'Failed to import projects' });
            }
        });


        // insert a customer
        app.post("/customers", async (req, res) => {
            const customers = req.body;
            try {
                const result = await customersCollection.insertOne(customers);
                res.send(result);
            }
            catch (error) {
                if (error.code === 11000) { // MongoDB duplicate key error code
                    res.status(400).send({ error: "Customer already exists." });
                } else {
                    console.error("Error inserting customer:", error);
                    res.status(500).send({ error: "Failed to add customer." });
                }
            }
        });

        // import functionality
        app.post('/customers/all', async (req, res) => {
            try {
                // This should be an array of customer objects
                const customers = req.body;

                // Ensure customers is an array
                if (!Array.isArray(customers) || customers.length === 0) {
                    return res.status(400).send({ error: 'Expected an array of customers' });
                }

                const result = await customersCollection.insertMany(customers, { ordered: false });

                res.send({ success: true, insertedCount: result.insertedCount });
            } catch (error) {
                console.error(error);
                res.status(500).send({ error: 'Failed to import customers' });
            }
        });

        // get all customers
        app.get("/customers/all", async (req, res) => {
            try {
                // Fetch all customers
                const customers = await customersCollection.find().toArray();
                res.send(customers);
            } catch (error) {
                console.error(error);
                res.status(500).send({ error: "Failed to fetch all customers" });
            }
        });


        // Get 1st 10 customers with pagination
        app.get("/customers", async (req, res) => {
            try {
                // Default to page 1
                const page = parseInt(req.query.page) || 1;
                // Default to 10 items per page
                const limit = parseInt(req.query.limit) || 10;
                const skip = (page - 1) * limit;

                const total = await customersCollection.countDocuments();
                const customers = await customersCollection.find().skip(skip).limit(limit).toArray();

                res.send({
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit),
                    customers,
                });
            } catch (error) {
                console.error(error);
                res.status(500).send({ error: "Failed to fetch customers" });
            }
        });


        // update a customers
        app.patch('/customers/:id', async (req, res) => {
            const item = req.body;
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updatedCustomer = {
                $set: {
                    name: item.name,
                    phone: item.phone,
                    email: item.email,
                    address: item.address,
                    status: item.status
                }
            }

            const result = await customersCollection.updateOne(filter, updatedCustomer)
            res.send(result);
        });


        // Insert a department with duplicate handling
        app.post("/departments", async (req, res) => {
            const departments = req.body;
            try {
                // Attempt to insert the new department
                const result = await departmentsCollection.insertOne(departments);
                res.send(result);
            } catch (error) {
                if (error.code === 11000) { // MongoDB duplicate key error code
                    res.status(400).send({ error: "Department already exists." });
                } else {
                    console.error("Error inserting department:", error);
                    res.status(500).send({ error: "Failed to add department." });
                }
            }
        });


        // Get 1st 10 departments with pagination
        app.get("/departments", async (req, res) => {
            try {
                // Default to page 1
                const page = parseInt(req.query.page) || 1;
                // Default to 10 items per page
                const limit = parseInt(req.query.limit) || 10;
                const skip = (page - 1) * limit;

                const total = await departmentsCollection.countDocuments();
                const departments = await departmentsCollection.find().skip(skip).limit(limit).toArray();

                res.send({
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit),
                    departments,
                });
            } catch (error) {
                console.error(error);
                res.status(500).send({ error: "Failed to fetch departments" });
            }
        });

        // update a departments
        app.patch('/departments/:id', async (req, res) => {
            const item = req.body;
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updatedDepartment = {
                $set: {
                    department_name: item.department_name,
                    department_status: item.department_status
                }
            }

            const result = await departmentsCollection.updateOne(filter, updatedDepartment)
            res.send(result);
        });


        // Insert a designation with duplicate handling
        app.post("/designations", async (req, res) => {
            const designations = req.body;
            try {
                // Attempt to insert the new designations
                const result = await designationsCollection.insertOne(designations);
                res.send(result);
            } catch (error) {
                if (error.code === 11000) { // MongoDB duplicate key error code
                    res.status(400).send({ error: "Designation already exists." });
                } else {
                    console.error("Error inserting designation:", error);
                    res.status(500).send({ error: "Failed to add designation." });
                }
            }
        });

        // Get 1st 10 designations with pagination
        app.get("/designations", async (req, res) => {
            try {
                // Default to page 1
                const page = parseInt(req.query.page) || 1;
                // Default to 10 items per page
                const limit = parseInt(req.query.limit) || 10;
                const skip = (page - 1) * limit;

                const total = await designationsCollection.countDocuments();
                const designations = await designationsCollection.find().skip(skip).limit(limit).toArray();

                res.send({
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit),
                    designations,
                });
            } catch (error) {
                console.error(error);
                res.status(500).send({ error: "Failed to fetch designations" });
            }
        });

        // update a designations
        app.patch('/designations/:id', async (req, res) => {
            const item = req.body;
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updatedDesignation = {
                $set: {
                    designation: item.designation,
                    designation_status: item.designation_status
                }
            }

            const result = await designationsCollection.updateOne(filter, updatedDesignation)
            res.send(result);
        });




        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);



app.get('/', (req, res) => {
    res.send("Kaka is running");
})

app.listen(port, () => {
    console.log(`Kaka is sitting on port ${port}`);
})