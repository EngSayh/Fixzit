#!/bin/bash
# Fixzit Deployment Helper - Interactive Decision Tool
# Run this to get personalized deployment recommendations

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

clear
echo -e "${CYAN}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                                                            ║"
echo "║           🚀 Fixzit Deployment Decision Helper           ║"
echo "║                                                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

# Question 1: Where are you now?
echo -e "${BLUE}Question 1: Where are you working right now?${NC}"
echo "  1) GitHub Codespaces (where you are now)"
echo "  2) My MacBook Pro (local machine)"
echo "  3) Other computer"
echo ""
read -p "Your choice (1-3): " location_choice

# Question 2: What's your goal?
echo ""
echo -e "${BLUE}Question 2: What do you want to do?${NC}"
echo "  1) Test the build locally (make sure it works)"
echo "  2) Deploy to production (make it live on my domain)"
echo "  3) Set up development environment (for coding)"
echo "  4) Fix the memory issues (builds keep failing)"
echo ""
read -p "Your choice (1-4): " goal_choice

# Question 3: GoDaddy hosting info
echo ""
echo -e "${BLUE}Question 3: What GoDaddy hosting do you have?${NC}"
echo "  1) VPS (Virtual Private Server)"
echo "  2) Dedicated Server"
echo "  3) Shared Hosting (Web Hosting with cPanel)"
echo "  4) Not sure / Don't have GoDaddy hosting yet"
echo ""
read -p "Your choice (1-4): " hosting_choice

# Question 4: Do you have SSH access?
if [ "$hosting_choice" == "1" ] || [ "$hosting_choice" == "2" ]; then
    echo ""
    echo -e "${BLUE}Question 4: Can you connect to your server via SSH?${NC}"
    echo "  1) Yes, I have SSH access and credentials"
    echo "  2) No, I don't have SSH access"
    echo "  3) Not sure how to check"
    echo ""
    read -p "Your choice (1-3): " ssh_choice
else
    ssh_choice="2"
fi

# Generate recommendations
clear
echo -e "${GREEN}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                                                            ║"
echo "║              📋 Your Personalized Recommendation          ║"
echo "║                                                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

# Build recommendation based on answers
if [ "$goal_choice" == "4" ]; then
    echo -e "${YELLOW}🔧 Fixing Memory Issues${NC}"
    echo ""
    echo "The memory issues are caused by GitHub Codespaces' limited resources."
    echo ""
    echo -e "${GREEN}Best Solution:${NC} Use your MacBook Pro for development"
    echo ""
    echo "Why? Your MacBook has:"
    echo "  ✅ More RAM (likely 16GB+)"
    echo "  ✅ More CPU cores (8-10 cores)"
    echo "  ✅ Better performance (no virtualization overhead)"
    echo ""
    echo -e "${CYAN}📖 Read: DEPLOYMENT_SETUP_GUIDE.md → Solution 2${NC}"
    echo ""
    echo "Quick start:"
    echo "  1. On your MacBook, clone the repo:"
    echo "     git clone https://github.com/EngSayh/Fixzit.git"
    echo "  2. cd Fixzit"
    echo "  3. ./setup-local-dev.sh"
    echo ""
    
elif [ "$goal_choice" == "3" ]; then
    echo -e "${YELLOW}💻 Setting Up Development Environment${NC}"
    echo ""
    if [ "$location_choice" == "2" ]; then
        echo -e "${GREEN}Perfect! You're on MacBook Pro${NC}"
        echo ""
        echo "Your MacBook is ideal for development. Here's what to do:"
        echo ""
        echo -e "${CYAN}Steps:${NC}"
        echo "  1. Clone repo: git clone https://github.com/EngSayh/Fixzit.git"
        echo "  2. cd Fixzit"
        echo "  3. Run: ./setup-local-dev.sh"
        echo "  4. Edit .env.local with your credentials"
        echo "  5. Start dev server: npm run dev"
        echo ""
        echo -e "${CYAN}📖 Read: DEPLOYMENT_SETUP_GUIDE.md → Solution 2${NC}"
    else
        echo -e "${YELLOW}Recommendation: Use your MacBook Pro${NC}"
        echo ""
        echo "While you can develop in Codespaces, your MacBook will be:"
        echo "  ✅ Faster (no network latency)"
        echo "  ✅ More powerful (better hardware)"
        echo "  ✅ More reliable (no memory issues)"
        echo ""
        echo -e "${CYAN}📖 Read: DEPLOYMENT_SETUP_GUIDE.md → Solution 2${NC}"
    fi
    
elif [ "$goal_choice" == "1" ]; then
    echo -e "${YELLOW}🧪 Testing the Build${NC}"
    echo ""
    if [ "$location_choice" == "2" ]; then
        echo -e "${GREEN}Perfect! Test on your MacBook Pro${NC}"
        echo ""
        echo "Your MacBook has the resources for fast builds (<30 seconds)."
        echo ""
        echo -e "${CYAN}Steps:${NC}"
        echo "  1. Ensure you're in the Fixzit directory"
        echo "  2. Run: npm install (if not done)"
        echo "  3. Run: time npm run build"
        echo "  4. Expected time: 15-25 seconds ✅"
        echo ""
        echo "If it works, you know the code is good!"
    else
        echo -e "${YELLOW}Current Environment: GitHub Codespaces (2-core/8GB)${NC}"
        echo ""
        echo "⚠️  Builds may fail due to memory constraints."
        echo ""
        echo -e "${GREEN}Better Option:${NC} Test on your MacBook Pro"
        echo "  - Expected build time: 15-25 seconds"
        echo "  - No memory issues"
        echo "  - Reliable results"
    fi
    
elif [ "$goal_choice" == "2" ]; then
    echo -e "${YELLOW}🌐 Deploying to Production${NC}"
    echo ""
    
    if [ "$hosting_choice" == "1" ] && [ "$ssh_choice" == "1" ]; then
        echo -e "${GREEN}Excellent! You have GoDaddy VPS with SSH access${NC}"
        echo ""
        echo "This is the BEST option for you!"
        echo ""
        echo -e "${CYAN}Why?${NC}"
        echo "  ✅ You already own the hosting (no extra cost)"
        echo "  ✅ Full control over your server"
        echo "  ✅ Your domain is already there"
        echo "  ✅ Can install MongoDB on same server"
        echo ""
        echo -e "${CYAN}📖 Read: GODADDY_DEPLOYMENT_GUIDE.md${NC}"
        echo ""
        echo "Quick overview:"
        echo "  1. SSH into your VPS"
        echo "  2. Install Node.js 18+"
        echo "  3. Clone your repo"
        echo "  4. Build and deploy"
        echo "  5. Configure Nginx"
        echo "  6. Set up SSL"
        echo ""
        echo "Estimated setup time: 1 hour"
        echo "Then: Automatic deployments via GitHub Actions"
        
    elif [ "$hosting_choice" == "2" ] && [ "$ssh_choice" == "1" ]; then
        echo -e "${GREEN}Perfect! Dedicated Server with SSH${NC}"
        echo ""
        echo "Same as VPS setup. You have even more power!"
        echo ""
        echo -e "${CYAN}📖 Read: GODADDY_DEPLOYMENT_GUIDE.md${NC}"
        
    elif [ "$hosting_choice" == "3" ]; then
        echo -e "${RED}⚠️  Shared Hosting doesn't support Node.js${NC}"
        echo ""
        echo "GoDaddy Shared Hosting cannot run Next.js applications."
        echo ""
        echo -e "${GREEN}Your Options:${NC}"
        echo ""
        echo "Option 1: Upgrade to GoDaddy VPS"
        echo "  - Cost: ~\$5-20/month"
        echo "  - Full Next.js support"
        echo "  - Your domain already there"
        echo ""
        echo "Option 2: Use Vercel (easiest)"
        echo "  - Cost: Free tier available"
        echo "  - 5-minute setup"
        echo "  - Connect your GoDaddy domain via DNS"
        echo ""
        echo -e "${CYAN}📖 Read: DEPLOYMENT_COMPARISON.md${NC}"
        
    else
        echo -e "${YELLOW}No hosting yet or not sure${NC}"
        echo ""
        echo -e "${GREEN}Recommended: Use Vercel${NC}"
        echo ""
        echo "Why Vercel?"
        echo "  ✅ Designed specifically for Next.js"
        echo "  ✅ 5-minute setup"
        echo "  ✅ Free tier available"
        echo "  ✅ Automatic deployments"
        echo "  ✅ Can connect your GoDaddy domain"
        echo ""
        echo -e "${CYAN}Steps:${NC}"
        echo "  1. npm install -g vercel"
        echo "  2. vercel login"
        echo "  3. vercel --prod"
        echo "  4. Add your GoDaddy domain in Vercel dashboard"
        echo ""
        echo -e "${CYAN}📖 Read: DEPLOYMENT_SETUP_GUIDE.md → Solution 3 → Option A${NC}"
    fi
fi

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}📚 All Documentation Available:${NC}"
echo "  • README_DEPLOYMENT.md         - Quick reference (start here)"
echo "  • DEPLOYMENT_SETUP_GUIDE.md    - Complete overview"
echo "  • GODADDY_DEPLOYMENT_GUIDE.md  - Direct GoDaddy deployment"
echo "  • DEPLOYMENT_COMPARISON.md     - Vercel vs GoDaddy"
echo "  • setup-local-dev.sh           - MacBook setup script"
echo ""
echo -e "${GREEN}Need help? Just ask with specific details about your setup!${NC}"
echo ""
