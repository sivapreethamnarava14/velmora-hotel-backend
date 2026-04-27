const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// LOCAL MONGODB CONNECTION (runs on your computer)
const MONGODB_URI = "mongodb://localhost:27017/velmora_hotel";

// Connect to Local MongoDB
mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('✅ Connected to Local MongoDB!'))
.catch(err => console.log('❌ MongoDB Error:', err.message));

// Booking Schema (defines how bookings are stored)
const bookingSchema = new mongoose.Schema({
    guestName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String },
    roomName: { type: String, required: true },
    roomId: { type: Number },
    pricePerNight: { type: Number, required: true },
    checkinDate: { type: String, required: true },
    checkoutDate: { type: String, required: true },
    specialRequests: { type: String },
    totalPrice: { type: Number },
    bookingRef: { type: String, unique: true },
    status: { type: String, default: 'confirmed' },
    createdAt: { type: Date, default: Date.now }
});

const Booking = mongoose.model('Booking', bookingSchema);

// ============ API ENDPOINTS ============

// 1. GET all rooms (available rooms for booking)
app.get('/api/rooms', (req, res) => {
    const rooms = [
        { 
            id: 1, 
            name: "Grand Deluxe King", 
            priceINR: 24131, 
            image: "https://images.pexels.com/photos/271618/pexels-photo-271618.jpeg",
            amenities: "KING BED | 55 INCH TV | RAIN SHOWER | MINI BAR",
            size: "45 sq m",
            maxOccupancy: 2
        },
        { 
            id: 2, 
            name: "Executive Suite", 
            priceINR: 33316, 
            image: "https://images.pexels.com/photos/2587054/pexels-photo-2587054.jpeg",
            amenities: "LIVING AREA | JACUZZI | COFFEE MACHINE | CITY VIEW",
            size: "65 sq m",
            maxOccupancy: 4
        },
        { 
            id: 3, 
            name: "Presidential Terrace", 
            priceINR: 50016, 
            image: "https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg",
            amenities: "PRIVATE TERRACE | HOME CINEMA | CHAMPAGNE BAR | PANORAMIC VIEW",
            size: "98 sq m",
            maxOccupancy: 6
        }
    ];
    res.json(rooms);
});

// 2. POST create a new booking
app.post('/api/bookings', async (req, res) => {
    try {
        const { 
            guestName, 
            email, 
            phone, 
            roomName, 
            roomId,
            pricePerNight, 
            checkinDate, 
            checkoutDate, 
            specialRequests 
        } = req.body;
        
        // Validate required fields
        if (!guestName || !email || !roomName || !pricePerNight || !checkinDate || !checkoutDate) {
            return res.status(400).json({ 
                success: false, 
                message: 'Missing required fields' 
            });
        }
        
        // Calculate number of nights and total price
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
        
        // Generate unique booking reference
        const bookingRef = 'VEL' + Date.now() + Math.floor(Math.random() * 1000);
        
        // Check if room is available for these dates
        const existingBookings = await Booking.find({
            roomName: roomName,
            status: 'confirmed',
            $or: [
                { checkinDate: { $lte: checkoutDate, $gte: checkinDate } },
                { checkoutDate: { $gte: checkinDate, $lte: checkoutDate } }
            ]
        });
        
        if (existingBookings.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Room is not available for the selected dates'
            });
        }
        
        // Create and save booking
        const booking = new Booking({
            guestName,
            email,
            phone,
            roomName,
            roomId,
            pricePerNight,
            checkinDate,
            checkoutDate,
            specialRequests,
            totalPrice,
            bookingRef
        });
        
        await booking.save();
        
        res.status(201).json({ 
            success: true, 
            message: 'Booking confirmed successfully!',
            bookingRef: bookingRef,
            totalPrice: totalPrice,
            nights: nights,
            booking: {
                id: booking._id,
                guestName: booking.guestName,
                roomName: booking.roomName,
                checkinDate: booking.checkinDate,
                checkoutDate: booking.checkoutDate
            }
        });
        
    } catch(error) {
        console.error('Booking error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error creating booking: ' + error.message 
        });
    }
});

// 3. GET all bookings (for admin/staff)
app.get('/api/bookings', async (req, res) => {
    try {
        const bookings = await Booking.find().sort({ createdAt: -1 });
        res.json({
            success: true,
            count: bookings.length,
            bookings: bookings
        });
    } catch(error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// 4. GET bookings by email (for customers to view their bookings)
app.get('/api/bookings/email/:email', async (req, res) => {
    try {
        const bookings = await Booking.find({ email: req.params.email }).sort({ createdAt: -1 });
        res.json({
            success: true,
            count: bookings.length,
            bookings: bookings
        });
    } catch(error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// 5. GET single booking by ID
app.get('/api/bookings/:id', async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);
        if (!booking) {
            return res.status(404).json({ 
                success: false, 
                message: 'Booking not found' 
            });
        }
        res.json({
            success: true,
            booking: booking
        });
    } catch(error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// 6. PUT cancel a booking
app.put('/api/bookings/:id/cancel', async (req, res) => {
    try {
        const booking = await Booking.findByIdAndUpdate(
            req.params.id,
            { status: 'cancelled' },
            { new: true }
        );
        
        if (!booking) {
            return res.status(404).json({ 
                success: false, 
                message: 'Booking not found' 
            });
        }
        
        res.json({
            success: true,
            message: 'Booking cancelled successfully',
            booking: booking
        });
    } catch(error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// 7. GET test endpoint (check if server is running)
app.get('/api/test', (req, res) => {
    res.json({ 
        message: '✅ Backend is working!', 
        mongodb: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
        timestamp: new Date().toISOString()
    });
});

// 8. GET stats (number of bookings)
app.get('/api/stats', async (req, res) => {
    try {
        const totalBookings = await Booking.countDocuments();
        const confirmedBookings = await Booking.countDocuments({ status: 'confirmed' });
        const cancelledBookings = await Booking.countDocuments({ status: 'cancelled' });
        
        res.json({
            success: true,
            stats: {
                totalBookings,
                confirmedBookings,
                cancelledBookings
            }
        });
    } catch(error) {
        res.status(500).json({ error: error.message });
    }
});

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
    console.log('═'.repeat(50));
    console.log('🏨 VELMORA HOTEL BACKEND SERVER');
    console.log('═'.repeat(50));
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📡 Test API: http://localhost:${PORT}/api/test`);
    console.log(`🏨 Rooms API: http://localhost:${PORT}/api/rooms`);
    console.log(`📋 Bookings API: http://localhost:${PORT}/api/bookings`);
    console.log(`📊 Stats API: http://localhost:${PORT}/api/stats`);
    console.log('═'.repeat(50));
    
    // Check MongoDB connection status
    if (mongoose.connection.readyState === 1) {
        console.log('✅ MongoDB Connected (Local)');
    } else {
        console.log('⚠️  Waiting for MongoDB connection...');
    }
    console.log('═'.repeat(50));
});