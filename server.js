const express = require('express');
const cors = require('cors');
const fs = require('fs');
const app = express();

app.use(cors());
app.use(express.json());

// FILE STORAGE - Permanent data storage on Render
const BOOKINGS_FILE = '/tmp/bookings.json';

// Load existing bookings from file
let bookings = [];

try {
    if (fs.existsSync(BOOKINGS_FILE)) {
        const data = fs.readFileSync(BOOKINGS_FILE, 'utf8');
        bookings = JSON.parse(data);
        console.log(`✅ Loaded ${bookings.length} existing bookings`);
    } else {
        console.log('📁 No existing bookings file, creating new one');
        // Create empty file
        fs.writeFileSync(BOOKINGS_FILE, JSON.stringify([], null, 2));
    }
} catch(err) {
    console.log('⚠️ Error loading bookings:', err.message);
}

// Save bookings to file
function saveBookings() {
    try {
        fs.writeFileSync(BOOKINGS_FILE, JSON.stringify(bookings, null, 2));
        console.log(`💾 Saved ${bookings.length} bookings permanently`);
        return true;
    } catch(err) {
        console.log('❌ Error saving:', err.message);
        return false;
    }
}

// ============ API ENDPOINTS ============

// 1. Get all rooms
app.get('/api/rooms', (req, res) => {
    const rooms = [
        { 
            id: 1, 
            name: "Grand Deluxe King", 
            priceINR: 24131, 
            image: "https://images.pexels.com/photos/271618/pexels-photo-271618.jpeg", 
            amenities: "KING BED | 55 INCH TV | RAIN SHOWER | MINI BAR" 
        },
        { 
            id: 2, 
            name: "Executive Suite", 
            priceINR: 33316, 
            image: "https://images.pexels.com/photos/2587054/pexels-photo-2587054.jpeg", 
            amenities: "LIVING AREA | JACUZZI | COFFEE MACHINE | CITY VIEW" 
        },
        { 
            id: 3, 
            name: "Presidential Terrace", 
            priceINR: 50016, 
            image: "https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg", 
            amenities: "PRIVATE TERRACE | HOME CINEMA | CHAMPAGNE BAR | PANORAMIC VIEW" 
        }
    ];
    res.json(rooms);
});

// 2. Create a new booking (Saves permanently)
app.post('/api/bookings', (req, res) => {
    try {
        const { guestName, email, phone, roomName, pricePerNight, checkinDate, checkoutDate, specialRequests } = req.body;
        
        // Validation
        if (!guestName || !email || !roomName || !pricePerNight || !checkinDate || !checkoutDate) {
            return res.status(400).json({ 
                success: false, 
                message: 'Missing required fields' 
            });
        }
        
        // Calculate nights and total price
        const checkin = new Date(checkinDate);
        const checkout = new Date(checkoutDate);
        const nights = Math.ceil((checkout - checkin) / (1000 * 60 * 60 * 24));
        
        if (nights <= 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Check-out date must be after check-in date' 
            });
        }
        
        const totalPrice = nights * pricePerNight;
        const bookingRef = 'VEL' + Date.now() + Math.floor(Math.random() * 1000);
        
        // Create booking object
        const newBooking = {
            id: bookings.length + 1,
            bookingRef: bookingRef,
            guestName: guestName,
            email: email,
            phone: phone || '',
            roomName: roomName,
            pricePerNight: pricePerNight,
            checkinDate: checkinDate,
            checkoutDate: checkoutDate,
            nights: nights,
            totalPrice: totalPrice,
            specialRequests: specialRequests || '',
            status: 'confirmed',
            createdAt: new Date().toISOString()
        };
        
        // Add to array
        bookings.push(newBooking);
        
        // Save to file (PERMANENT!)
        const saved = saveBookings();
        
        if (saved) {
            res.json({ 
                success: true, 
                message: '✅ Booking confirmed! Data saved permanently!',
                bookingRef: bookingRef,
                totalPrice: totalPrice,
                nights: nights
            });
        } else {
            res.json({ 
                success: true, 
                message: '⚠️ Booking confirmed but data may not be permanent',
                bookingRef: bookingRef,
                totalPrice: totalPrice
            });
        }
        
    } catch(error) {
        console.error('Booking error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error creating booking: ' + error.message 
        });
    }
});

// 3. Get all bookings (View all user data)
app.get('/api/bookings', (req, res) => {
    res.json({ 
        success: true, 
        count: bookings.length, 
        bookings: bookings 
    });
});

// 4. Download all bookings as JSON
app.get('/api/download', (req, res) => {
    res.json(bookings);
});

// 5. Get booking by reference number
app.get('/api/bookings/:ref', (req, res) => {
    const booking = bookings.find(b => b.bookingRef === req.params.ref);
    if (booking) {
        res.json({ success: true, booking: booking });
    } else {
        res.status(404).json({ success: false, message: 'Booking not found' });
    }
});

// 6. Test endpoint
app.get('/api/test', (req, res) => {
    res.json({ 
        message: '✅ Velmora Hotel Backend is LIVE!', 
        status: 'active',
        storage: 'Permanent (File-based)',
        bookingsCount: bookings.length,
        storageLocation: '/tmp/bookings.json',
        timestamp: new Date().toISOString()
    });
});

// 7. Statistics
app.get('/api/stats', (req, res) => {
    const totalRevenue = bookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0);
    res.json({
        success: true,
        stats: {
            totalBookings: bookings.length,
            totalRevenue: totalRevenue,
            confirmedBookings: bookings.filter(b => b.status === 'confirmed').length
        }
    });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('═════════════════════════════════════════════════');
    console.log('🏨 VELMORA HOTEL BACKEND SERVER');
    console.log('═════════════════════════════════════════════════');
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`💾 Storage: Permanent file storage on Render`);
    console.log(`📁 File location: ${BOOKINGS_FILE}`);
    console.log(`📊 Current bookings: ${bookings.length}`);
    console.log('═════════════════════════════════════════════════');
    console.log('📡 API Endpoints:');
    console.log(`   GET  /api/test     - Check server status`);
    console.log(`   GET  /api/rooms    - Get all rooms`);
    console.log(`   POST /api/bookings - Create booking`);
    console.log(`   GET  /api/bookings - View all bookings`);
    console.log(`   GET  /api/download - Download data`);
    console.log('═════════════════════════════════════════════════');
});
