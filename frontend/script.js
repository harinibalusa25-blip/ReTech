
const API = "/api/products";

let products = [];
let wishlist = JSON.parse(localStorage.getItem("retechWishlist")) || [];
let currentCategory = "All";
let wishlistMode = false;

function saveWishlist() {
    localStorage.setItem("retechWishlist", JSON.stringify(wishlist));
}

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[char]);
}

function safeImage(value) {
    try {
        const url = new URL(value, window.location.href);
        if (url.protocol === "https:" || url.protocol === "http:") {
            return escapeHTML(url.href);
        }
    } catch (error) {}

    return "https://placehold.co/600x400?text=ReTech";
}

// LOAD PRODUCTS FROM BACKEND

async function loadProducts() {
    try {
        const response = await fetch(API);

        if (!response.ok) throw new Error("Unable to load products");

        products = await response.json();
        searchProducts();

        updateWishlistCount();

    } catch (error) {
        console.error(error);
        showToast("Backend connection failed!");
    }
}

// DISPLAY PRODUCTS

function displayProducts(list) {
    const grid = document.getElementById("productGrid");
    grid.innerHTML = "";

    document.getElementById("resultCount").textContent =
        `Showing ${list.length} products`;

    if (list.length === 0) {
        grid.innerHTML = `
            <div class="empty-message">
                <h2>No products found!</h2>
                <p>Try another search.</p>
            </div>`;
        return;
    }

    list.forEach(product => {
        const card = document.createElement("div");
        card.className = "product-card";

        const liked = wishlist.includes(product.id);

        card.innerHTML = `
            <div class="product-image">
                <img src="${safeImage(product.image)}"
                     alt="${escapeHTML(product.name)}"
                     loading="lazy">
                <span class="condition">${escapeHTML(product.condition)}</span>
                <button class="heart-btn ${liked ? "liked" : ""}"
                    onclick="toggleWishlist(${product.id})">
                    ${liked ? "♥" : "♡"}
                </button>
            </div>

            <div class="product-info">
                <span class="product-category">${escapeHTML(product.category)}</span>
                <h3>${escapeHTML(product.name)}</h3>
                <p class="product-description">${escapeHTML(product.description)}</p>

                <div class="product-bottom">
                    <span class="price">₹${Number(product.price).toLocaleString("en-IN")}</span>
                    <button class="view-btn" onclick="showDetails(${product.id})">
                        View Details
                    </button>
                </div>
            </div>`;

        grid.appendChild(card);
    });
}

// FILTER PRODUCTS

function filterCategory(category, element) {
    currentCategory = category;
    wishlistMode = false;

    document.querySelectorAll(".category-card").forEach(card => {
        card.classList.remove("active");
    });

    element.classList.add("active");
    searchProducts();
}

// SEARCH PRODUCTS

function searchProducts() {
    const keyword = document.getElementById("searchInput")
        .value.toLowerCase().trim();

    let filtered = [...products];

    if (currentCategory !== "All") {
        filtered = filtered.filter(p => p.category === currentCategory);
    }

    if (wishlistMode) {
        filtered = filtered.filter(p => wishlist.includes(p.id));
    }

    if (keyword) {
        filtered = filtered.filter(p =>
            p.name.toLowerCase().includes(keyword) ||
            p.category.toLowerCase().includes(keyword) ||
            p.description.toLowerCase().includes(keyword)
        );
    }

    applySorting(filtered);
}

// SORT PRODUCTS

function sortProducts() {
    searchProducts();
}

function applySorting(list) {
    const value = document.getElementById("sortSelect").value;

    if (value === "low") {
        list.sort((a, b) => a.price - b.price);
    } else if (value === "high") {
        list.sort((a, b) => b.price - a.price);
    } else if (value === "newest") {
        list.sort((a, b) => b.date - a.date);
    }

    displayProducts(list);
}

// WISHLIST

function toggleWishlist(id) {
    if (wishlist.includes(id)) {
        wishlist = wishlist.filter(item => item !== id);
        showToast("Removed from wishlist");
    } else {
        wishlist.push(id);
        showToast("Added to wishlist ❤️");
    }

    saveWishlist();
    searchProducts();
    updateWishlistCount();
}

function updateWishlistCount() {
    document.getElementById("wishCount").textContent = wishlist.length;
}

function showWishlist() {
    wishlistMode = true;
    currentCategory = "All";

    document.querySelectorAll(".category-card").forEach(card => {
        card.classList.remove("active");
    });

    document.querySelector(".category-card").classList.add("active");

    document.getElementById("searchInput").value = "";

    searchProducts();

    document.getElementById("products").scrollIntoView({
        behavior: "smooth"
    });
}

// SELL PRODUCT

function openSellForm() {
    document.getElementById("sellModal").classList.add("show");
}

function closeSellForm() {
    document.getElementById("sellModal").classList.remove("show");
}

document.getElementById("sellForm").addEventListener("submit", async function(event) {
    event.preventDefault();

    const name = document.getElementById("itemName").value.trim();
    const category = document.getElementById("itemCategory").value;
    const price = Number(document.getElementById("itemPrice").value);
    const condition = document.getElementById("itemCondition").value;
    const image = document.getElementById("itemImage").value.trim();
    const description = document.getElementById("itemDescription").value.trim();

    if (!name || !category || !condition || !description ||
        !Number.isFinite(price) || price <= 0) {
        showToast("Enter valid product details");
        return;
    }

    try {
        const response = await fetch(API, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                name,
                category,
                price,
                condition,
                description,
                image
            })
        });

        const result = await response.json();

        if (!response.ok) throw new Error(result.message);

        document.getElementById("sellForm").reset();
        closeSellForm();

        currentCategory = "All";
        wishlistMode = false;

        document.querySelectorAll(".category-card").forEach(card => {
            card.classList.remove("active");
        });

        document.querySelector(".category-card").classList.add("active");

        document.getElementById("searchInput").value = "";
        document.getElementById("sortSelect").value = "default";

        await loadProducts();

        showToast("Product listed successfully!");

    } catch (error) {
        showToast(error.message || "Unable to add product");
    }
});

// PRODUCT DETAILS

function showDetails(id) {
    const product = products.find(p => p.id === id);
    if (!product) return;

    document.getElementById("detailsBody").innerHTML = `
        <span class="eyebrow">PRODUCT INFORMATION</span>
        <img src="${safeImage(product.image)}" alt="${escapeHTML(product.name)}">
        <span class="product-category">${escapeHTML(product.category)}</span>
        <h2>${escapeHTML(product.name)}</h2>
        <h2>₹${Number(product.price).toLocaleString("en-IN")}</h2>
        <p><strong>Condition:</strong> ${escapeHTML(product.condition)}</p>
        <p>${escapeHTML(product.description)}</p>
        <button class="primary-btn full-btn" onclick="contactSeller()">
            Contact Seller
        </button>
        <button class="delete-btn" onclick="deleteProduct(${product.id})">
            Delete Listing
        </button>
    `;

    document.getElementById("detailsModal").classList.add("show");
}

function closeDetails() {
    document.getElementById("detailsModal").classList.remove("show");
}

function contactSeller() {
    showToast("Seller contact will be added later!");
}

// DELETE PRODUCT

async function deleteProduct(id) {
    if (!confirm("Are you sure you want to delete this listing?")) return;

    try {
        const response = await fetch(`${API}/${id}`, {
            method: "DELETE"
        });

        const result = await response.json();

        if (!response.ok) throw new Error(result.message);

        wishlist = wishlist.filter(item => item !== id);
        saveWishlist();

        closeDetails();

        await loadProducts();

        showToast("Product deleted successfully!");

    } catch (error) {
        showToast(error.message || "Unable to delete product");
    }
}

// NOTIFICATIONS

let toastTimeout;

function showToast(message) {
    const toast = document.getElementById("toast");

    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(toastTimeout);

    toastTimeout = setTimeout(() => {
        toast.classList.remove("show");
    }, 2500);
}

// CLOSE MODALS

document.querySelectorAll(".modal").forEach(modal => {
    modal.addEventListener("click", event => {
        if (event.target === modal) {
            modal.classList.remove("show");
        }
    });
});

// INITIALIZE

loadProducts();
updateWishlistCount();
