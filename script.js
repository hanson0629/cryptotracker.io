// Global variables
let selectedCrypto = null;
let priceChart = null;
let cryptoData = []; // Store the fetched data

// DOM elements
const cryptoContainer = document.getElementById('crypto-container');
const currencySelect = document.getElementById('currency-select');
const refreshButton = document.getElementById('refresh-btn');
const priceChartCanvas = document.getElementById('price-chart');
const chartInfo = document.getElementById('chart-info');
const searchInput = document.getElementById('search-input');
const darkModeToggle = document.getElementById('dark-mode-toggle');

// Add this new variable for time range
let selectedTimeRange = '7'; // Default to 7 days

// List of cryptocurrencies to track
const cryptoList = [
    'bitcoin',
    'ethereum',
    'ripple',
    'cardano',
    'solana',
    'polkadot',
    'dogecoin',
    'litecoin'
];

// Add these global variables
let portfolio = [];

// Add these DOM elements
const portfolioCryptoSelect = document.getElementById('portfolio-crypto-select');
const portfolioAmount = document.getElementById('portfolio-amount');
const portfolioAddBtn = document.getElementById('portfolio-add-btn');
const portfolioHoldings = document.getElementById('portfolio-holdings');
const portfolioTotal = document.getElementById('portfolio-total');
const portfolioValue = document.getElementById('portfolio-value');
const portfolioProfit = document.getElementById('portfolio-profit');

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    // Fetch initial data
    fetchCryptoPrices();
    
    // Set up event listeners
    refreshButton.addEventListener('click', fetchCryptoPrices);
    currencySelect.addEventListener('change', fetchCryptoPrices);
    searchInput.addEventListener('input', filterCryptos);
    darkModeToggle.addEventListener('click', toggleDarkMode);
    
    // Add event listeners for time range buttons
    document.querySelectorAll('.time-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Update active button
            document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            
            // Update selected time range
            selectedTimeRange = e.target.dataset.days;
            
            // Update chart if a crypto is selected
            if (selectedCrypto) {
                fetchHistoricalData(selectedCrypto, currencySelect.value);
            }
        });
    });
    
    // Add event listener for portfolio add button
    portfolioAddBtn.addEventListener('click', addToPortfolio);
    
    // Load portfolio from local storage
    loadPortfolio();
    
    // Check for saved dark mode preference
    if (localStorage.getItem('darkMode') === 'enabled') {
        document.body.classList.add('dark-mode');
        darkModeToggle.textContent = '☀️';
    }
});

// Toggle dark mode
function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    
    if (document.body.classList.contains('dark-mode')) {
        localStorage.setItem('darkMode', 'enabled');
        darkModeToggle.textContent = '☀️';
    } else {
        localStorage.setItem('darkMode', 'disabled');
        darkModeToggle.textContent = '🌙';
    }
    
    // Update chart if it exists
    if (selectedCrypto && priceChart) {
        fetchHistoricalData(selectedCrypto, currencySelect.value);
    }
}

// Filter cryptocurrencies based on search input
function filterCryptos() {
    const searchTerm = searchInput.value.toLowerCase();
    
    // If no search term, display all cryptocurrencies
    if (!searchTerm) {
        displayCryptoData(cryptoData);
        return;
    }
    
    // Filter the data
    const filteredData = cryptoData.filter(crypto => 
        crypto.name.toLowerCase().includes(searchTerm) || 
        crypto.symbol.toLowerCase().includes(searchTerm)
    );
    
    // Display filtered data
    displayCryptoData(filteredData);
}

// Fetch cryptocurrency prices from CoinGecko API
async function fetchCryptoPrices() {
    try {
        // Show loading state
        cryptoContainer.innerHTML = '<div class="loading">Loading cryptocurrency data...</div>';
        
        // Get selected currency
        const currency = currencySelect.value;
        
        // Fetch data from CoinGecko API
        const response = await fetch(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=${currency}&ids=${cryptoList.join(',')}&order=market_cap_desc&per_page=100&page=1&sparkline=false&price_change_percentage=24h`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch cryptocurrency data');
        }
        
        cryptoData = await response.json();
        
        // Display cryptocurrency data
        displayCryptoData(cryptoData);
        
        // If a cryptocurrency was previously selected, select it again
        if (selectedCrypto) {
            const selectedCard = document.querySelector(`[data-id="${selectedCrypto}"]`);
            if (selectedCard) {
                selectedCard.classList.add('selected');
                fetchHistoricalData(selectedCrypto, currency);
            } else {
                selectedCrypto = null;
                resetChart();
            }
        }
    } catch (error) {
        console.error('Error fetching cryptocurrency data:', error);
        cryptoContainer.innerHTML = `<div class="loading">Error: ${error.message}</div>`;
    }
}

// Display cryptocurrency data
function displayCryptoData(data) {
    // Clear container
    cryptoContainer.innerHTML = '';
    
    // If no data to display
    if (data.length === 0) {
        cryptoContainer.innerHTML = '<div class="loading">No cryptocurrencies found</div>';
        return;
    }
    
    // Display cryptocurrency data
    data.forEach(crypto => {
        const card = createCryptoCard(crypto, currencySelect.value);
        cryptoContainer.appendChild(card);
    });
}

// Create a cryptocurrency card element
function createCryptoCard(crypto, currency) {
    const card = document.createElement('div');
    card.className = 'crypto-card';
    card.dataset.id = crypto.id;
    
    // Format price change
    const priceChange = crypto.price_change_percentage_24h;
    const priceChangeClass = priceChange >= 0 ? 'price-up' : 'price-down';
    const priceChangeSymbol = priceChange >= 0 ? '+' : '';
    
    // Format currency symbol
    let currencySymbol = '$';
    if (currency === 'eur') currencySymbol = '€';
    if (currency === 'jpy') currencySymbol = '¥';
    if (currency === 'gbp') currencySymbol = '£';
    
    // Format market cap and volume
    const marketCap = formatLargeNumber(crypto.market_cap);
    const volume = formatLargeNumber(crypto.total_volume);
    
    card.innerHTML = `
        <div class="crypto-header">
            <img src="${crypto.image}" alt="${crypto.name}" class="crypto-icon">
            <div>
                <span class="crypto-name">${crypto.name}</span>
                <span class="crypto-symbol">(${crypto.symbol.toUpperCase()})</span>
            </div>
        </div>
        <div class="crypto-price">${currencySymbol}${crypto.current_price.toLocaleString()}</div>
        <div class="price-change ${priceChangeClass}">
            ${priceChangeSymbol}${priceChange.toFixed(2)}% (24h)
        </div>
        <div class="crypto-details">
            <span>Market Cap: ${currencySymbol}${marketCap}</span>
            <span>24h Volume: ${currencySymbol}${volume}</span>
        </div>
    `;
    
    // Add click event to show historical data
    card.addEventListener('click', () => {
        // Remove selected class from all cards
        document.querySelectorAll('.crypto-card').forEach(c => c.classList.remove('selected'));
        
        // Add selected class to clicked card
        card.classList.add('selected');
        
        // Update selected cryptocurrency
        selectedCrypto = crypto.id;
        
        // Fetch historical data
        fetchHistoricalData(crypto.id, currency);
    });
    
    return card;
}

// Format large numbers (e.g., market cap, volume)
function formatLargeNumber(num) {
    if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    return num.toLocaleString();
}

// Fetch historical price data for a cryptocurrency
// Update the fetchHistoricalData function to use the selected time range
async function fetchHistoricalData(cryptoId, currency) {
    try {
        chartInfo.textContent = 'Loading historical data...';
        
        // Use the selected time range
        const response = await fetch(`https://api.coingecko.com/api/v3/coins/${cryptoId}/market_chart?vs_currency=${currency}&days=${selectedTimeRange}`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch historical data');
        }
        
        const data = await response.json();
        
        // Update chart with historical data
        updateChart(data.prices, cryptoId);
    } catch (error) {
        console.error('Error fetching historical data:', error);
        chartInfo.textContent = `Error: ${error.message}`;
    }
}

// Update the updateChart function to show appropriate time labels
function updateChart(priceData, cryptoId) {
    // Format data for Chart.js
    const labels = [];
    const prices = [];
    
    // Adjust date formatting based on time range
    const formatDate = (timestamp) => {
        const date = new Date(timestamp);
        if (selectedTimeRange === '1') {
            // For 1 day, show hours
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (selectedTimeRange === '7' || selectedTimeRange === '30') {
            // For 1 week or 1 month, show day and month
            return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        } else {
            // For longer periods, show month and year
            return date.toLocaleDateString([], { month: 'short', year: 'numeric' });
        }
    };
    
    priceData.forEach(dataPoint => {
        labels.push(formatDate(dataPoint[0]));
        prices.push(dataPoint[1]);
    });
    
    // Get cryptocurrency name
    const cryptoName = document.querySelector(`[data-id="${cryptoId}"] .crypto-name`).textContent;
    
    // Destroy existing chart if it exists
    if (priceChart) {
        priceChart.destroy();
    }
    
    // Set chart colors based on dark mode
    const isDarkMode = document.body.classList.contains('dark-mode');
    const borderColor = isDarkMode ? '#3498db' : '#3498db';
    const backgroundColor = isDarkMode ? 'rgba(52, 152, 219, 0.2)' : 'rgba(52, 152, 219, 0.1)';
    const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    const textColor = isDarkMode ? '#f5f5f5' : '#666';
    
    // Create new chart
    const ctx = priceChartCanvas.getContext('2d');
    priceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: `${cryptoName} Price`,
                data: prices,
                borderColor: borderColor,
                backgroundColor: backgroundColor,
                borderWidth: 2,
                fill: true,
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        color: textColor
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    grid: {
                        color: gridColor
                    },
                    ticks: {
                        color: textColor
                    }
                },
                x: {
                    grid: {
                        color: gridColor
                    },
                    ticks: {
                        color: textColor
                    }
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            }
        }
    });
    
    // Update chart info with time range
    let timeRangeText = '';
    if (selectedTimeRange === '1') timeRangeText = '24 hours';
    else if (selectedTimeRange === '7') timeRangeText = '7 days';
    else if (selectedTimeRange === '30') timeRangeText = '30 days';
    else if (selectedTimeRange === '90') timeRangeText = '3 months';
    else if (selectedTimeRange === '365') timeRangeText = '1 year';
    
    chartInfo.textContent = `Showing ${timeRangeText} price history for ${cryptoName}`;
}

// Reset the chart when no cryptocurrency is selected
function resetChart() {
    if (priceChart) {
        priceChart.destroy();
        priceChart = null;
    }
    
    chartInfo.textContent = 'Select a cryptocurrency to view its price history';
}