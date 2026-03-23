# Meto — Meeting Room Booking

A modern, full-stack Meeting Room Booking application built using vanilla HTML/CSS/JS and a Node.js Express backend. 

## Features
- **Modern UI:** Features high-quality glassmorphism and "keycap" 3D button styling.
- **Keyboard Shortcuts:** Use `1`, `2`, `3`, `4` on your keyboard to instantly navigate between tabs.
- **RESTful Backend API:** All bookings are saved persistently to a local JSON file.
- **Availability Checker:** Users can filter for specific times and room requirements.
- **Auto Conflict Detection:** The backend checks the time slots for overlaps to prevent double-booking.

## How to Run

1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the backend Server:
   ```bash
   node server.js
   ```
4. Open your browser and navigate to `http://localhost:3000` to interact with the application.

## Tech Stack
- Frontend: HTML5, CSS3, Vanilla JavaScript (Browser `fetch` API)
- Backend: Node.js, Express.js, CORS
- Database: Local Flat-file JSON Storage (`data.json`)
