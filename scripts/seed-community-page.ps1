Write-Host "Creating Community CMS Page..." -ForegroundColor Cyan

$headers = @{
    "Content-Type" = "application/json"
    "x-user" = '{"id":"admin","role":"SUPER_ADMIN","tenantId":"t0"}'
}

$communityPage = @{
    slug = "community"
    title = "Community"
    content = @"
# Fixzit Community

Welcome to the Fixzit Community - your hub for support, collaboration, and updates.

## Join Our Community

Connect with other facility managers, property owners, and service providers using the Fixzit platform.

### Community Forums

- **General Discussion** - Share experiences and best practices
- **Feature Requests** - Suggest new features and improvements
- **Technical Support** - Get help from our community experts
- **Marketplace Tips** - Share vendor recommendations and reviews

## Resources

### Knowledge Base
Access our comprehensive guides and tutorials to make the most of Fixzit:
- Getting Started Guides
- Video Tutorials
- API Documentation
- Best Practices

### Events & Webinars
Join our regular events:
- Monthly User Meetups
- Training Webinars
- Product Updates
- Industry Insights

## Support Channels

### Get Help
- **Help Center**: Access our self-service support portal
- **Community Forum**: Ask questions and share solutions
- **Email Support**: support@fixzit.co
- **Live Chat**: Available for premium users

### Stay Updated
Follow us for the latest updates:
- **Newsletter**: Monthly updates and tips
- **Blog**: Industry insights and platform news
- **Social Media**: @FixzitPlatform

## Contributing

We value your feedback and contributions:
- Report bugs and issues
- Suggest new features
- Share your success stories
- Help other community members

## Community Guidelines

1. **Be Respectful** - Treat all members with courtesy
2. **Stay On Topic** - Keep discussions relevant
3. **Share Knowledge** - Help others when you can
4. **No Spam** - Avoid promotional content
5. **Protect Privacy** - Don't share sensitive information

## Contact Community Team

Have questions or suggestions for our community?
- Email: community@fixzit.co
- Forum: [Join Discussion](https://community.fixzit.co)

Together, we're building the future of facility management!
"@
    status = "PUBLISHED"
}

$body = ConvertTo-Json $communityPage -Depth 10

try {
    # First try to create the page
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/cms/pages" -Method POST -Headers $headers -Body $body -ErrorAction SilentlyContinue
    if ($response) {
        # Use response to satisfy analyzer and provide context
        $id = $response.id
        if (-not $id) { $id = $response._id }
        Write-Host "Created Community page successfully! ID: $id" -ForegroundColor Green
    } else {
        Write-Host "Created Community page successfully!" -ForegroundColor Green
    }
} catch {
    # If creation fails, try to update existing page
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:3000/api/cms/pages/community" -Method PATCH -Headers $headers -Body $body
        if ($response) {
            $status = $response.status
            Write-Host "Updated Community page successfully! Status: $status" -ForegroundColor Green
        } else {
            Write-Host "Updated Community page successfully!" -ForegroundColor Green
        }
    } catch {
        Write-Host "Failed to create/update Community page: $_" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "You can now visit: http://localhost:3000/cms/community" -ForegroundColor Yellow
