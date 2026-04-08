// dashboard.js - Single file for dashboard functionality

const API_BASE_URL = 'http://localhost:3000/api'; // Update this to your backend URL

// Modal functionality
const modal = document.getElementById('addItemModal');
const addBtn = document.querySelector('.add-btn');
const closeBtn = document.querySelector('.close');

if (addBtn) {
    addBtn.onclick = function() {
        modal.style.display = 'block';
    }
}

if (closeBtn) {
    closeBtn.onclick = function() {
        modal.style.display = 'none';
    }
}

window.onclick = function(event) {
    if (event.target == modal) {
        modal.style.display = 'none';
    }
}

// Handle form submission
const addItemForm = document.getElementById('addItemForm');
if (addItemForm) {
    addItemForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = {
            name: document.getElementById('itemName').value,
            expiryDate: document.getElementById('expiryDate').value,
            quantity: parseInt(document.getElementById('quantity').value) || 1,
            category: document.getElementById('category').value
        };

        try {
            const response = await fetch(`${API_BASE_URL}/items`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                const newItem = await response.json();
                addItemToDashboard(newItem);
                modal.style.display = 'none';
                addItemForm.reset();
            }
        } catch (error) {
            console.error('Error:', error);
        }
    });
}

// Function to add item to dashboard
function addItemToDashboard(item) {
    const itemsContainer = document.querySelector('.items');
    
    const itemCard = document.createElement('div');
    itemCard.className = 'item-card';
    
    const expiryDate = new Date(item.expiryDate);
    const formattedDate = expiryDate.toLocaleDateString('en-GB');
    
    itemCard.innerHTML = `
        <div class="item-info">
            <img src="https://via.placeholder.com/40" alt="${item.name}" />
            <div>
                <h3>${item.name}</h3>
                <p>${formattedDate}</p>
                ${item.quantity > 1 ? `<span class="quantity">Qty: ${item.quantity}</span>` : ''}
            </div>
        </div>
        <span class="time warn">New</span>
    `;
    
    itemsContainer.appendChild(itemCard);
}

// Load existing items
async function loadItems() {
    try {
        const response = await fetch(`${API_BASE_URL}/items`);
        const items = await response.json();
        
        const itemsContainer = document.querySelector('.items');
        const heading = document.querySelector('.sub');
        itemsContainer.innerHTML = '';
        itemsContainer.appendChild(heading);
        
        items.forEach(item => addItemToDashboard(item));
    } catch (error) {
        console.error('Error loading items:', error);
    }
}

// Load items when page loads
document.addEventListener('DOMContentLoaded', loadItems);