"""
Friengineers — Default seed content.

Every key in DEFAULT_CONTENT is a "section". Each section is a JSON-serializable
structure that the public site renders and the admin panel edits.

To edit any of this content later, either:
  1. Use the admin panel (http://localhost:8080/admin.html), or
  2. Update the database directly with the bundled CLI tool (server/cli.py).
"""

import os

DEFAULT_ADMIN = {
    # A password must be supplied through the environment for a new database.
    "username": os.environ.get("FRIENGINEERS_ADMIN_USER", "admin").strip(),
    "password": os.environ.get("FRIENGINEERS_ADMIN_PASSWORD", ""),
}

DEFAULT_CONTENT = {
    # ---------------------------------------------------------------- brand
    "brand": {
        "name": "Friengineers",
        "tagline": "Engineered by Friends, Built on Trust.",
        "logo_text": "F",
        "logo_sub": "Friengineers",
    },

    # ----------------------------------------------------------------- hero
    "hero": {
        "badge": "Building the future, together",
        "headline": "We build <span class='grad'>reliable, modern, fast & secure</span> systems.",
        "subheadline": "Friengineers is a collective of friends and engineers crafting dependable software that moves businesses forward — engineered with care, delivered with trust.",
        "primary_cta": "Start a Project",
        "secondary_cta": "See What We Do",
        "stats": [
            {"value": 12, "suffix": "+", "label": "Projects Delivered"},
            {"value": 8, "suffix": "+", "label": "Team Members"},
            {"value": 98, "suffix": "%", "label": "Client Satisfaction"},
            {"value": 5, "suffix": "+", "label": "Years Combined Exp."}
        ]
    },

    # ---------------------------------------------------------------- about
    "about": {
        "heading": "Who We Are",
        "subheading": "A trusted crew of friends turned engineers, building software the right way.",
        "story": "Friengineers was born from a simple idea: when friends with real engineering discipline come together, they can build systems people rely on. We started as a small group of builders who cared deeply about quality — and grew into a team that designs, engineers, and ships dependable products.",
        "mission": "To build reliable, modern, fast, and secure software that our clients can trust with their most important work — and to grow into something big, the honest way.",
        "vision": "To become a trusted engineering partner across Bangladesh and beyond, known for craftsmanship, transparency, and long-term relationships.",
        "values": [
            {"icon": "shield", "title": "Reliable", "text": "We ship systems that hold up under real load — no fragile shortcuts, no excuses."},
            {"icon": "bolt", "title": "Fast", "text": "Performance is a feature. We engineer for speed in both our products and our process."},
            {"icon": "lock", "title": "Secure", "text": "Security is built in from day one — every layer, every line of code."},
            {"icon": "spark", "title": "Modern", "text": "We adopt modern, proven technology so our clients are never left behind."},
            {"icon": "heart", "title": "Trustworthy", "text": "Transparent pricing, honest timelines, and communication you can count on."},
            {"icon": "users", "title": "Collaborative", "text": "We work as partners, not vendors — your goals become our goals."}
        ],
        "timeline": [
            {"year": "2024", "title": "The Idea", "text": "A group of friends start building side projects together, sharing one standard: do it right."},
            {"year": "2025", "title": "Going Formal", "text": "Friengineers is formalized as a collective — first clients trust us with production systems."},
            {"year": "2026", "title": "Growing", "text": "We expand into mobile, cloud, and AI. We're just getting started."},
            {"year": "Future", "title": "Something Big", "text": "Our goal: a dependable engineering brand the whole region knows and trusts."}
        ]
    },

    # ------------------------------------------------------------- services
    "services": {
        "heading": "What We Do",
        "subheading": "Full-stack engineering services, delivered with discipline.",
        "items": [
            {
                "icon": "code",
                "title": "Web Development",
                "text": "Modern, responsive, and lightning-fast web applications built with proven frameworks."
            },
            {
                "icon": "layers",
                "title": "Software Engineering",
                "text": "Custom software, APIs, and integrations designed around real business needs."
            },
            {
                "icon": "phone",
                "title": "Mobile Apps",
                "text": "Native and cross-platform mobile experiences your users will love to open."
            },
            {
                "icon": "brain",
                "title": "AI & Machine Learning",
                "text": "Practical AI solutions — from automation and chatbots to data-driven insights."
            },
            {
                "icon": "cloud",
                "title": "Cloud & DevOps",
                "text": "Scalable cloud architecture, CI/CD pipelines, and infrastructure that just works."
            },
            {
                "icon": "shield",
                "title": "Security & Audits",
                "text": "Security reviews, hardening, and audits that keep your systems safe."
            }
        ]
    },

    # ------------------------------------------------------------- projects
    "projects": {
        "heading": "What We're Building",
        "subheading": "Projects we're proud of — and the ones coming next.",
        "items": [
            {
                "title": "School ERP System",
                "category": "Software Engineering",
                "text": "A complete enterprise resource planning system for schools — admissions, attendance, grades, and finance in one place.",
                "status": "Live",
                "tags": ["Python", "Django", "PostgreSQL"]
            },
            {
                "title": "Warranty Parts Platform",
                "category": "Automation",
                "text": "An automated warranty claim processing platform with LLM-assisted review and tracking.",
                "status": "Live",
                "tags": ["Python", "FastAPI", "AI"]
            },
            {
                "title": "Friengineers Site",
                "category": "Web Development",
                "text": "This very website — a modern, animated presence backed by a content management API.",
                "status": "Live",
                "tags": ["HTML", "CSS", "Python"]
            },
            {
                "title": "Next Big Thing",
                "category": "Coming Soon",
                "text": "We're working on something big. A reliable, modern platform built for the future.",
                "status": "In Progress",
                "tags": ["R&D"]
            }
        ]
    },

    # ----------------------------------------------------------------- team
    "team": {
        "heading": "The People",
        "subheading": "Friends first, engineers always — the crew behind Friengineers.",
        "items": [
            {"name": "Founding Crew", "role": "Founders & Engineers", "text": "A tight-knit team of friends who met through a shared obsession with building things well."}
        ]
    },

    # -------------------------------------------------------------- contact
    "contact": {
        "heading": "Let's Build Together",
        "subheading": "Tell us about your project. We'll respond within one business day.",
        "address": "Bashundhara R/A, Dhaka, Bangladesh",
        "email": "the.friengineers.org@gmail.com",
        "phone": "+880 1XXX-XXXXXX",
        "hours": "Sun – Fri, 9:00 AM – 7:00 PM",
        "form_title": "Send us a message",
        "cta": "Send Message",
        "success": "Thanks! Your message has been received. We'll get back to you soon."
    },

    # --------------------------------------------------------------- footer
    "footer": {
        "about": "Friengineers is a collective of friends and engineers building reliable, modern, fast, and secure software. Engineered by friends, built on trust.",
        "tagline": "Engineered by Friends, Built on Trust.",
        "links_title": "Quick Links",
        "services_title": "Services",
        "contact_title": "Contact",
        "copyright": "© {year} Friengineers. All rights reserved."
    }
}
