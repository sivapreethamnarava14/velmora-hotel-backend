const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());

// In-memory storage (no MongoDB needed)
let bookings = [];

// ROOMS API
app.get('/api/rooms', (req, res) => {
    const rooms = [
        { id: 1, name: "Grand Deluxe King", priceINR: 24131, image: "https://images.pexels.com/photos/271618/pexels-photo-271618.jpeg", amenities: "KING BED | 55 INCH TV | RAIN SHOWER | MINI BAR" },
        { id: 2, name: "Executive Suite", priceINR: 33316, image: "https://images.pexels.com/photos/2587054/pexels-photo-2587054.jpeg", amenities: "LIVING AREA | JACUZZI | COFFEE MACHINE | CITY VIEW" },
        { id: 3, name: "Presidential Terrace", priceINR: 50016, image: "https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg", amenities: "PRIVATE TERRACE | HOME CINEMA | CHAMPAGNE BAR | PANORAMIC VIEW" }
    ];
    res.json(rooms);
});

// BOOKING API
app.post('/api/bookings', (req, res) => {
    try {
        const { guestName, email, phone, roomName, pricePerNight, checkinDate, checkoutDate, specialRequests } = req.body;
        
        const checkin = new Date(checkinDate);
        const checkout = new Date(checkoutDate);
        const nights = Math.ceil((checkout - checkin) / (1000 * 60 * 60 * 24));
        const totalPrice = nights * pricePerNight;
        const bookingRef = 'VEL' + Date.now() + Math.floor(Math.random() * 1000);
        
        const newBooking = {
            id: bookings.length + 1,
            guestName,
            email,
            phone,
            roomName,
            pricePerNight,
            checkinDate,
            checkoutDate,
            specialRequests,
            totalPrice,
            bookingRef,
            createdAt: new Date().toISOString(),
            status: 'confirmed'
        };
        
        bookings.push(newBooking);
        
        res.json({ 
            success: true, 
            message: 'Booking confirmed successfully!',
            bookingRef: bookingRef,
            totalPrice: totalPrice,
            nights: nights
        });
        
    } catch(error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET all bookings
app.get('/api/bookings', (req, res) => {
    res.json({ success: true, count: bookings.length, bookings: bookings });
});

// TEST endpoint
app.get('/api/test', (req, res) => {
    res.json({ 
        message: '✅ Velmora Hotel Backend is LIVE!',
        status: 'active',
        bookingsCount: bookings.length
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('═════════════════════════════════════════════════');
    console.log('🏨 VELMORA HOTEL BACKEND SERVER');
    console.log('═════════════════════════════════════════════════');
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 Test API: /api/test`);
    console.log(`🏨 Rooms API: /api/rooms`);
    console.log(`📋 Bookings API: /api/bookings`);
    console.log('═════════════════════════════════════════════════');
});
