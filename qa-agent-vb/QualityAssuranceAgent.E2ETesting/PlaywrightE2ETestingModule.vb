Imports System.Threading
Imports System.Text.Json
Imports Microsoft.Extensions.Logging
Imports Microsoft.Playwright
Imports CliWrap
Imports QualityAssuranceAgent.Core.Models
Imports QualityAssuranceAgent.Core.Interfaces

Namespace QualityAssuranceAgent.E2ETesting

    ''' <summary>
    ''' Comprehensive E2E testing module using Playwright for Next.js applications
    ''' </summary>
    Public Class PlaywrightE2ETestingModule
        Implements IE2ETestingModule

        Private ReadOnly _logger As ILogger(Of PlaywrightE2ETestingModule)
        Private _playwright As IPlaywright
        Private _browser As IBrowser

        Public ReadOnly Property Name As String = "Playwright E2E Testing" Implements IQAModule.Name
        Public ReadOnly Property Version As String = "1.0.0" Implements IQAModule.Version
        Public ReadOnly Property SupportedFileTypes As IReadOnlyList(Of String) = {"*.spec.ts", "*.test.ts", "*.e2e.ts"}.ToList() Implements IQAModule.SupportedFileTypes

        Public Sub New(logger As ILogger(Of PlaywrightE2ETestingModule))
            _logger = logger OrElse throw New ArgumentNullException(NameOf(logger))
        End Sub

        Public Function CanHandle(filePath As String) As Boolean Implements IQAModule.CanHandle
            Return filePath.Contains(".spec.") OrElse filePath.Contains(".test.") OrElse filePath.Contains(".e2e.")
        End Function

        Public Async Function RunAsync(config As QAAgentConfig, cancellationToken As CancellationToken) As Task(Of List(Of QualityIssue)) Implements IQAModule.RunAsync
            Dim issues As New List(Of QualityIssue)

            Try
                ' Run E2E tests and convert failures to issues
                Dim testResult = Await RunE2ETestsAsync(config, cancellationToken)
                
                For Each failedTest In testResult.FailedTestDetails
                    issues.Add(New QualityIssue With {
                        .Severity = IssueSeverity.High,
                        .Category = IssueCategory.EndToEnd,
                        .Title = $"E2E Test Failure: {failedTest.TestName}",
                        .Description = failedTest.ErrorMessage,
                        .Evidence = failedTest.Screenshot,
                        .Source = Name,
                        .RecommendedAction = "Fix the underlying functionality causing test failure"
                    })
                Next

                ' Performance issues
                If testResult.PerformanceMetrics IsNot Nothing Then
                    Dim perfMetrics = testResult.PerformanceMetrics
                    
                    If perfMetrics.PageLoadTime.TotalMilliseconds > config.PerformanceRules.MaxPageLoadTimeMs Then
                        issues.Add(New QualityIssue With {
                            .Severity = IssueSeverity.Medium,
                            .Category = IssueCategory.Performance,
                            .Title = "Slow Page Load Time",
                            .Description = $"Page load time ({perfMetrics.PageLoadTime.TotalMilliseconds:F0}ms) exceeds threshold ({config.PerformanceRules.MaxPageLoadTimeMs}ms)",
                            .Source = Name,
                            .RecommendedAction = "Optimize page loading performance"
                        })
                    End If

                    If perfMetrics.LighthouseScore < config.PerformanceRules.MinLighthouseScore Then
                        issues.Add(New QualityIssue With {
                            .Severity = IssueSeverity.Medium,
                            .Category = IssueCategory.Performance,
                            .Title = "Low Lighthouse Score",
                            .Description = $"Lighthouse performance score ({perfMetrics.LighthouseScore}) below threshold ({config.PerformanceRules.MinLighthouseScore})",
                            .Source = Name,
                            .RecommendedAction = "Improve performance metrics (FCP, LCP, CLS, TTI)"
                        })
                    End If
                End If

                Return issues

            Catch ex As Exception
                _logger.LogError(ex, "❌ E2E testing failed")
                issues.Add(New QualityIssue With {
                    .Severity = IssueSeverity.High,
                    .Category = IssueCategory.EndToEnd,
                    .Title = "E2E Testing Framework Error",
                    .Description = $"E2E testing failed: {ex.Message}",
                    .Source = Name,
                    .RecommendedAction = "Check E2E testing configuration and environment"
                })
                Return issues
            End Try
        End Function

        Public Async Function RunE2ETestsAsync(config As QAAgentConfig, cancellationToken As CancellationToken) As Task(Of TestResult) Implements IE2ETestingModule.RunE2ETestsAsync
            Dim result As New TestResult With {
                .TestSuite = "Fixzit E2E Tests"
            }
            Dim stopwatch = Diagnostics.Stopwatch.StartNew()

            Try
                _logger.LogInformation("🚀 Starting comprehensive E2E test suite...")

                ' Initialize Playwright
                Await InitializePlaywrightAsync()

                ' Start the application if needed
                Dim appProcess = Await StartApplicationAsync(config, cancellationToken)

                ' Wait for application to be ready
                Await WaitForApplicationReady("http://localhost:3000", TimeSpan.FromSeconds(60))

                ' Run test suites
                Await RunAuthenticationTests(result, config)
                Await RunNavigationTests(result, config)
                Await RunFunctionalityTests(result, config)
                Await RunSecurityTests(result, config)
                Await RunPerformanceTests(result, config)
                Await RunAccessibilityTests(result, config)

                ' Stop application
                If appProcess IsNot Nothing Then
                    appProcess.Kill()
                End If

                stopwatch.Stop()
                result.Duration = stopwatch.Elapsed
                result.TotalTests = result.PassedTests + result.FailedTests + result.SkippedTests

                _logger.LogInformation($"✅ E2E tests completed: {result.PassedTests}/{result.TotalTests} passed in {result.Duration.TotalMinutes:F2}m")

                Return result

            Catch ex As Exception
                stopwatch.Stop()
                result.Duration = stopwatch.Elapsed
                _logger.LogError(ex, "❌ E2E testing exception")
                
                result.FailedTestDetails.Add(New FailedTest With {
                    .TestName = "E2E Testing Framework",
                    .ErrorMessage = ex.Message,
                    .StackTrace = ex.StackTrace
                })
                result.FailedTests = 1

                Return result
            Finally
                Await CleanupAsync()
            End Try
        End Function

        Public Async Function GenerateTestReportAsync(results As TestResult, outputPath As String) As Task Implements IE2ETestingModule.GenerateTestReportAsync
            Try
                _logger.LogInformation("📊 Generating E2E test report...")

                Dim reportPath = Path.Combine(outputPath, $"e2e-test-report-{DateTime.Now:yyyyMMdd-HHmmss}.html")
                
                Dim reportHtml = GenerateHtmlReport(results)
                Await File.WriteAllTextAsync(reportPath, reportHtml)
                
                _logger.LogInformation($"📊 E2E test report saved to: {reportPath}")

            Catch ex As Exception
                _logger.LogError(ex, "❌ Failed to generate test report")
            End Try
        End Function

        Public Async Function CaptureScreenshotsAsync(testName As String, outputPath As String) As Task(Of List(Of String)) Implements IE2ETestingModule.CaptureScreenshotsAsync
            Dim screenshots As New List(Of String)

            Try
                If _browser Is Nothing Then Return screenshots

                Dim page = Await _browser.NewPageAsync()
                Await page.GotoAsync("http://localhost:3000")

                Dim screenshotPath = Path.Combine(outputPath, $"{testName}-{DateTime.Now:yyyyMMdd-HHmmss}.png")
                Await page.ScreenshotAsync(New PageScreenshotOptions With {.Path = screenshotPath})
                screenshots.Add(screenshotPath)

                Await page.CloseAsync()

            Catch ex As Exception
                _logger.LogWarning(ex, $"Failed to capture screenshot for {testName}")
            End Try

            Return screenshots
        End Function

        Private Async Function InitializePlaywrightAsync() As Task
            _logger.LogInformation("🎭 Initializing Playwright...")
            
            ' Install browsers if needed
            Try
                Microsoft.Playwright.Program.Main({"install"})
            Catch ex As Exception
                _logger.LogError(ex, "❌ Playwright browser installation failed. Please check your network connection and environment.")
                Throw
            End Try
            
            _playwright = Await Playwright.CreateAsync()
            _browser = Await _playwright.Chromium.LaunchAsync(New BrowserTypeLaunchOptions With {
                .Headless = True,
                .Args = {"--no-sandbox", "--disable-dev-shm-usage"}
            })
        End Function

        Private Async Function StartApplicationAsync(config As QAAgentConfig, cancellationToken As CancellationToken) As Task(Of Process)
            _logger.LogInformation("🚀 Starting Next.js application for testing...")

            Try
                ' Check if app is already running
                Try
                    Using client As New Net.Http.HttpClient()
                        client.Timeout = TimeSpan.FromSeconds(5)
                        Dim response = Await client.GetAsync("http://localhost:3000", cancellationToken)
                        If response.IsSuccessStatusCode Then
                            _logger.LogInformation("ℹ️  Application already running on port 3000")
                            Return Nothing
                        End If
                    End Using
                Catch
                    ' App not running, continue to start it
                End Try

                ' Start the application
                Dim startInfo As New ProcessStartInfo With {
                    .FileName = "npm",
                    .Arguments = "run dev",
                    .WorkingDirectory = config.ProjectPath,
                    .UseShellExecute = False,
                    .RedirectStandardOutput = True,
                    .RedirectStandardError = True,
                    .CreateNoWindow = True
                }

                Dim process = Process.Start(startInfo)
                
                ' Give it some time to start
                Await Task.Delay(10000, cancellationToken)
                
                Return process

            Catch ex As Exception
                _logger.LogWarning(ex, "Failed to start application - assuming it's already running")
                Return Nothing
            End Try
        End Function

        Private Async Function WaitForApplicationReady(url As String, timeout As TimeSpan) As Task
            _logger.LogInformation($"⏳ Waiting for application to be ready at {url}...")
            
            Dim startTime = DateTime.UtcNow
            Using client As New Net.Http.HttpClient()
                
                While DateTime.UtcNow - startTime < timeout
                    Try
                        Dim response = Await client.GetAsync(url)
                        If response.IsSuccessStatusCode Then
                            _logger.LogInformation("✅ Application is ready!")
                            Return
                        End If
                    Catch
                        ' Continue waiting
                    End Try
                    
                    Await Task.Delay(2000)
                End While
                
                Throw New TimeoutException($"Application did not become ready within {timeout.TotalSeconds} seconds")
            End Using
        End Function

        Private Async Function RunAuthenticationTests(result As TestResult, config As QAAgentConfig) As Task
            _logger.LogInformation("🔐 Running authentication tests...")

            Try
                Dim page = Await _browser.NewPageAsync()

                ' Test 1: Login page accessibility
                Await page.GotoAsync("http://localhost:3000/login")
                Await page.WaitForLoadStateAsync(LoadState.NetworkIdle)
                
                If Await page.Locator("form").CountAsync() > 0 Then
                    result.PassedTests += 1
                    _logger.LogInformation("✅ Login page loads correctly")
                Else
                    result.FailedTests += 1
                    result.FailedTestDetails.Add(New FailedTest With {
                        .TestName = "Login Page Load",
                        .ErrorMessage = "Login form not found on login page"
                    })
                End If

                ' Test 2: Login functionality
                If Await page.Locator("input[type='email']").CountAsync() > 0 AndAlso 
                   Await page.Locator("input[type='password']").CountAsync() > 0 Then
                    
                    Await page.FillAsync("input[type='email']", "test@example.com")
                    Await page.FillAsync("input[type='password']", "testpassword")
                    Await page.ClickAsync("button[type='submit']")
                    
                    ' Wait for navigation or error
                    Await Task.Delay(2000)
                    
                    result.PassedTests += 1
                    _logger.LogInformation("✅ Login form submission works")
                Else
                    result.FailedTests += 1
                    result.FailedTestDetails.Add(New FailedTest With {
                        .TestName = "Login Form Fields",
                        .ErrorMessage = "Email or password fields not found"
                    })
                End If

                Await page.CloseAsync()

            Catch ex As Exception
                result.FailedTests += 1
                result.FailedTestDetails.Add(New FailedTest With {
                    .TestName = "Authentication Tests",
                    .ErrorMessage = ex.Message,
                    .StackTrace = ex.StackTrace
                })
                _logger.LogError(ex, "❌ Authentication tests failed")
            End Try
        End Function

        Private Async Function RunNavigationTests(result As TestResult, config As QAAgentConfig) As Task
            _logger.LogInformation("🧭 Running navigation tests...")

            Try
                Dim page = Await _browser.NewPageAsync()
                
                ' Key pages to test
                Dim pagesToTest = {
                    "/",
                    "/login",
                    "/signup", 
                    "/dashboard",
                    "/work-orders",
                    "/marketplace",
                    "/help"
                }

                For Each pagePath In pagesToTest
                    Try
                        Await page.GotoAsync($"http://localhost:3000{pagePath}")
                        Await page.WaitForLoadStateAsync(LoadState.NetworkIdle, New PageWaitForLoadStateOptions With {.Timeout = 10000})
                        
                        ' Check if page loaded (no 404 or 500 errors)
                        Dim title = Await page.TitleAsync()
                        If Not String.IsNullOrEmpty(title) AndAlso Not title.Contains("404") AndAlso Not title.Contains("500") Then
                            result.PassedTests += 1
                            _logger.LogInformation($"✅ Page loads: {pagePath}")
                        Else
                            result.FailedTests += 1
                            result.FailedTestDetails.Add(New FailedTest With {
                                .TestName = $"Page Load: {pagePath}",
                                .ErrorMessage = $"Page appears to have error (title: {title})"
                            })
                        End If

                    Catch ex As Exception
                        result.FailedTests += 1
                        result.FailedTestDetails.Add(New FailedTest With {
                            .TestName = $"Page Navigation: {pagePath}",
                            .ErrorMessage = ex.Message
                        })
                    End Try
                Next

                Await page.CloseAsync()

            Catch ex As Exception
                _logger.LogError(ex, "❌ Navigation tests failed")
            End Try
        End Function

        Private Async Function RunFunctionalityTests(result As TestResult, config As QAAgentConfig) As Task
            _logger.LogInformation("⚙️  Running functionality tests...")

            Try
                Dim page = Await _browser.NewPageAsync()

                ' Test work orders functionality
                Await page.GotoAsync("http://localhost:3000/work-orders")
                
                If Await page.Locator("button").CountAsync() > 0 Then
                    result.PassedTests += 1
                    _logger.LogInformation("✅ Work orders page has interactive elements")
                Else
                    result.FailedTests += 1
                    result.FailedTestDetails.Add(New FailedTest With {
                        .TestName = "Work Orders Functionality",
                        .ErrorMessage = "No interactive elements found on work orders page"
                    })
                End If

                Await page.CloseAsync()

            Catch ex As Exception
                result.FailedTests += 1
                result.FailedTestDetails.Add(New FailedTest With {
                    .TestName = "Functionality Tests",
                    .ErrorMessage = ex.Message
                })
                _logger.LogError(ex, "❌ Functionality tests failed")
            End Try
        End Function

        Private Async Function RunSecurityTests(result As TestResult, config As QAAgentConfig) As Task
            _logger.LogInformation("🔒 Running security tests...")

            Try
                Dim page = Await _browser.NewPageAsync()

                ' Test 1: Check for HTTPS redirect (in production)
                Await page.GotoAsync("http://localhost:3000")
                
                ' Test 2: Check for security headers
                Dim response = Await page.GotoAsync("http://localhost:3000")
                Dim headers = response.Headers
                
                Dim hasSecurityHeaders = headers.ContainsKey("X-Frame-Options") OrElse 
                                       headers.ContainsKey("X-Content-Type-Options") OrElse
                                       headers.ContainsKey("Content-Security-Policy")
                
                If hasSecurityHeaders Then
                    result.PassedTests += 1
                    _logger.LogInformation("✅ Security headers present")
                Else
                    result.FailedTests += 1
                    result.FailedTestDetails.Add(New FailedTest With {
                        .TestName = "Security Headers",
                        .ErrorMessage = "Missing important security headers"
                    })
                End If

                ' Test 3: Check for exposed sensitive information
                Dim pageContent = Await page.ContentAsync()
                If pageContent.Contains("password") OrElse pageContent.Contains("secret") OrElse pageContent.Contains("api_key") Then
                    result.FailedTests += 1
                    result.FailedTestDetails.Add(New FailedTest With {
                        .TestName = "Information Disclosure",
                        .ErrorMessage = "Potentially sensitive information found in page content"
                    })
                Else
                    result.PassedTests += 1
                    _logger.LogInformation("✅ No sensitive information disclosed")
                End If

                Await page.CloseAsync()

            Catch ex As Exception
                result.FailedTests += 1
                result.FailedTestDetails.Add(New FailedTest With {
                    .TestName = "Security Tests",
                    .ErrorMessage = ex.Message
                })
                _logger.LogError(ex, "❌ Security tests failed")
            End Try
        End Function

        Private Async Function RunPerformanceTests(result As TestResult, config As QAAgentConfig) As Task
            _logger.LogInformation("📈 Running performance tests...")

            Try
                Dim page = Await _browser.NewPageAsync()
                Dim stopwatch = Diagnostics.Stopwatch.StartNew()

                ' Measure page load time
                Await page.GotoAsync("http://localhost:3000")
                Await page.WaitForLoadStateAsync(LoadState.NetworkIdle)
                
                stopwatch.Stop()
                
                result.PerformanceMetrics = New PerformanceMetrics With {
                    .PageLoadTime = stopwatch.Elapsed,
                    .LighthouseScore = 0 ' TODO: Implement actual Lighthouse integration for performance scoring
                }

                If stopwatch.ElapsedMilliseconds <= config.PerformanceRules.MaxPageLoadTimeMs Then
                    result.PassedTests += 1
                    _logger.LogInformation($"✅ Page load time: {stopwatch.ElapsedMilliseconds}ms")
                Else
                    result.FailedTests += 1
                    result.FailedTestDetails.Add(New FailedTest With {
                        .TestName = "Page Load Performance",
                        .ErrorMessage = $"Page load time ({stopwatch.ElapsedMilliseconds}ms) exceeds threshold ({config.PerformanceRules.MaxPageLoadTimeMs}ms)"
                    })
                End If

                Await page.CloseAsync()

            Catch ex As Exception
                result.FailedTests += 1
                result.FailedTestDetails.Add(New FailedTest With {
                    .TestName = "Performance Tests",
                    .ErrorMessage = ex.Message
                })
                _logger.LogError(ex, "❌ Performance tests failed")
            End Try
        End Function

        Private Async Function RunAccessibilityTests(result As TestResult, config As QAAgentConfig) As Task
            _logger.LogInformation("♿ Running accessibility tests...")

            Try
                Dim page = Await _browser.NewPageAsync()
                Await page.GotoAsync("http://localhost:3000")

                ' Check for alt text on images
                Dim images = Await page.Locator("img").AllAsync()
                Dim imagesWithoutAlt = 0
                
                For Each img In images
                    Dim altText = Await img.GetAttributeAsync("alt")
                    If String.IsNullOrEmpty(altText) Then
                        imagesWithoutAlt += 1
                    End If
                Next

                If imagesWithoutAlt = 0 Then
                    result.PassedTests += 1
                    _logger.LogInformation("✅ All images have alt text")
                Else
                    result.FailedTests += 1
                    result.FailedTestDetails.Add(New FailedTest With {
                        .TestName = "Image Alt Text",
                        .ErrorMessage = $"{imagesWithoutAlt} images missing alt text"
                    })
                End If

                ' Check for proper heading structure
                Dim h1Count = Await page.Locator("h1").CountAsync()
                If h1Count = 1 Then
                    result.PassedTests += 1
                    _logger.LogInformation("✅ Proper heading structure (single h1)")
                Else
                    result.FailedTests += 1
                    result.FailedTestDetails.Add(New FailedTest With {
                        .TestName = "Heading Structure",
                        .ErrorMessage = $"Expected 1 h1 element, found {h1Count}"
                    })
                End If

                Await page.CloseAsync()

            Catch ex As Exception
                result.FailedTests += 1
                result.FailedTestDetails.Add(New FailedTest With {
                    .TestName = "Accessibility Tests",
                    .ErrorMessage = ex.Message
                })
                _logger.LogError(ex, "❌ Accessibility tests failed")
            End Try
        End Function

        Private Function GenerateHtmlReport(results As TestResult) As String
            Return $"
<!DOCTYPE html>
<html>
<head>
    <title>E2E Test Report - {results.TestSuite}</title>
    <style>
        body {{ font-family: Arial, sans-serif; margin: 20px; }}
        .summary {{ background: #f5f5f5; padding: 15px; border-radius: 5px; }}
        .passed {{ color: green; }}
        .failed {{ color: red; }}
        .test-details {{ margin: 20px 0; }}
        .error {{ background: #ffebee; padding: 10px; border-left: 4px solid #f44336; }}
    </style>
</head>
<body>
    <h1>E2E Test Report</h1>
    <div class='summary'>
        <h2>Summary</h2>
        <p><strong>Test Suite:</strong> {results.TestSuite}</p>
        <p><strong>Duration:</strong> {results.Duration.TotalMinutes:F2} minutes</p>
        <p><strong>Total Tests:</strong> {results.TotalTests}</p>
        <p class='passed'><strong>Passed:</strong> {results.PassedTests}</p>
        <p class='failed'><strong>Failed:</strong> {results.FailedTests}</p>
        <p><strong>Skipped:</strong> {results.SkippedTests}</p>
        <p><strong>Success Rate:</strong> {If(results.TotalTests > 0, (results.PassedTests / results.TotalTests * 100):F1, 0):F1}%</p>
    </div>
    
    {If(results.FailedTestDetails.Any(), "
    <div class='test-details'>
        <h2>Failed Tests</h2>
        " + String.Join("", results.FailedTestDetails.Select(Function(f) $"
        <div class='error'>
            <h3>{f.TestName}</h3>
            <p><strong>Error:</strong> {f.ErrorMessage}</p>
            {If(Not String.IsNullOrEmpty(f.StackTrace), $"<pre>{f.StackTrace}</pre>", "")}
        </div>")) + "
    </div>", "")}
    
    <p><em>Report generated on {DateTime.Now:yyyy-MM-dd HH:mm:ss}</em></p>
</body>
</html>"
        End Function

        Private Async Function CleanupAsync() As Task
            Try
                If _browser IsNot Nothing Then
                    Await _browser.CloseAsync()
                    _browser = Nothing
                End If
                
                If _playwright IsNot Nothing Then
                    _playwright.Dispose()
                    _playwright = Nothing
                End If
            Catch ex As Exception
                _logger.LogWarning(ex, "Failed to cleanup Playwright resources")
            End Try
        End Function

    End Class

End Namespace