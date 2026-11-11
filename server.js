
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// File paths
const productsFile = path.join(__dirname, "products.json");
const frontendFolder = path.join(__dirname, "frontend");

// Serve frontend
app.use(express.static(frontendFolder));

// Read products
function getProducts() {
    try {
        if (!fs.existsSync(productsFile)) {
            fs.writeFileSync(productsFile, "[]");
        }

        const data = fs.readFileSync(productsFile, "utf8");
        return JSON.parse(data);
    } catch (error) {
        console.error("Error reading products:", error);
        return [];
    }
}

// Save products
function saveProducts(products) {
    fs.writeFileSync(
        productsFile,
        JSON.stringify(products, null, 2)
    );
}

// Home route
app.get("/", (req, res) => {
    res.sendFile(path.join(frontendFolder, "index.html"));
});

// API home
app.get("/api", (req, res) => {
    res.json({
        message: "Welcome to ReTech API",
        status: "Server is running"
    });
});

// Get all products
app.get("/api/products", (req, res) => {
    res.json(getProducts());
});

// Search products
app.get("/api/products/search", (req, res) => {
    const search = (req.query.q || "").toLowerCase();

    const products = getProducts();

    const results = products.filter(product =>
        JSON.stringify(product).toLowerCase().includes(search)
    );

    res.json(results);
});

// Add a product
app.post("/api/products", (req, res) => {
    const products = getProducts();
    const newProduct = req.body;

    if (!newProduct || typeof newProduct !== "object" ||
        Array.isArray(newProduct)) {
        return res.status(400).json({
            message: "Invalid product data"
        });
    }

    if (!newProduct.name || !newProduct.price ||
        !newProduct.category) {
        return res.status(400).json({
            message: "Name, price and category are required"
        });
    }

    const product = {
        ...newProduct,
        id: Date.now().toString()
    };

    products.push(product);
    saveProducts(products);

    res.status(201).json({
        message: "Product added successfully",
        product
    });
});

// Delete a product
app.delete("/api/products/:id", (req, res) => {
    const products = getProducts();

    const updatedProducts = products.filter(
        product => String(product.id) !== req.params.id
    );

    if (updatedProducts.length === products.length) {
        return res.status(404).json({
            message: "Product not found"
        });
    }

    saveProducts(updatedProducts);

    res.json({
        message: "Product deleted successfully"
    });
});

// Start server
app.listen(PORT, "0.0.0.0", () => {
    console.log(`ReTech server running on port ${PORT}`);
});
