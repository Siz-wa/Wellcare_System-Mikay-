# Patient Record Management System with Appointment SchedulingWellCare Clinics and Laboratory – Walter Dasmariñas BranchProject Overview
This Capstone Project presents a modernized Patient Record Management System with Appointment Scheduling designed specifically for WellCare Clinics and Laboratory (Walter Dasmariñas).
The system addresses the need for digitized medical records and an automated booking process, replacing manual or legacy workflows with a secure, high-performance web application.

## Tech Stack
The project is built using a modern full-stack architecture to ensure scalability and a premium user experience:

* Backend: Laravel (PHP Framework)
* Frontend: React 19 with TypeScript
* Bridge: Inertia.js (Server-side routing with a SPA feel)
* Styling: Tailwind CSS
* UI Components: shadcn/ui and Radix UI
* Build Tool: Vite

## Key Features

* Electronic Medical Records (EMR): Centralized management of patient profiles, clinical history, and laboratory results for the Dasmariñas branch.
* Automated Appointment Scheduling: A real-time booking module to reduce patient wait times and optimize clinic flow.
* Secure Authentication: Role-based access control (RBAC) for Admin, Medical Staff, and Patients.
* Responsive Dashboard: A clean, accessible interface for clinic personnel to manage daily operations.

## System Architecture
By utilizing Inertia.js, this capstone project eliminates the complexity of building a separate API. It allows for the rapid development of a single-page application (SPA) while maintaining the robust security features of the Laravel ecosystem.

## Installation & Setup (Windows laptop)

Needs: **XAMPP 8.2+** (for PHP and MySQL), **Node.js LTS**, **Git**. Composer is optional; the setup script downloads it if missing.

```
git clone https://github.com/Siz-wa/Wellcare_System-Mikay-.git
cd Wellcare_System-Mikay-
.\wellcare.cmd setup
.\wellcare.cmd start
```

`setup` installs the PHP and JS packages, creates `.env` (MySQL `wellcare_db`, user `root`), starts XAMPP MySQL if it is not running, creates the database, seeds the clean demo record and builds the interface. It is the only step that needs internet. Re-run it after every `git pull`. It never wipes a database that already has accounts.

| Command | What it does |
| --- | --- |
| `.\wellcare.cmd start` | Asks **Online or Offline** (shows the current mode; Enter keeps it), then runs the system at http://127.0.0.1:8000 (server, queue, Reverb, scheduler). `-Online` / `-Offline` skip the question |
| `.\wellcare.cmd reset` | Wipes the database and reseeds the clean demo record (dates move to today) |
| `.\wellcare.cmd offline` | Makes the system work with **no internet**: local fonts and map card, mail to log, no STUN, Reverb on this machine |
| `.\wellcare.cmd online` | Undoes `offline` (restores the previous `.env`) |
| `.\wellcare.cmd status` | Shows the settings and what is running |
| `.\wellcare.cmd share` | Runs the system **and** puts it on a public https link (Cloudflare quick tunnel), then prints the link and a **QR code** for the phone. For video consultations between the laptop and a phone. Needs internet; downloads `cloudflared` the first time if it is not installed. Ctrl+C closes the tunnels |

Every demo password is `password123`. `reset` prints the accounts to use: patients `juan.dela.cruz@gmail.com` (video consult ready today), `maria.santos@gmail.com` and `pedro.reyes@gmail.com`; doctor `dr.reyes@wellcare.com`; `hr.garcia@wellcare.com`; `nurse.delacruz@wellcare.com`; `admin@wellcare.com`.

Offline video consultations work between two browser windows on the same laptop (for example the doctor in Chrome and the patient in Edge).

For a laptop + phone video call, run `.\wellcare.cmd share`, wait for the QR code, scan it with the phone and log in as the patient; log in as the doctor in the browser that opens on the laptop. See `TWO-DEVICE-TESTING.md` for the test checklist and troubleshooting.

## Capstone Team:
   1. Aliyah Mikayla Danao
   2. Lhenny Melchor
   3. Hazel Ann Parpan
   
    
* Project Title: Development of a Patient Record Management System with Appointment Scheduling
* Target Client: WellCare Clinics and Laboratory – Walter Dasmariñas
* License: This project is for academic purposes as part of the Institute of Computing & Digital Innovation Capstone requirements.


