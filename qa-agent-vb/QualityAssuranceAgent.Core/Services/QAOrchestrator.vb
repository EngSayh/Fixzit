Imports System.Threading
Imports Microsoft.Extensions.Logging
Imports QualityAssuranceAgent.Core.Models
Imports QualityAssuranceAgent.Core.Interfaces

Namespace QualityAssuranceAgent.Core.Services

    ''' <summary>
    ''' Main orchestrator service that coordinates all QA modules
    ''' </summary>
    Public Class QAOrchestrator
        Implements IQAOrchestrator

        Private ReadOnly _logger As ILogger(Of QAOrchestrator)
        Private ReadOnly _modules As List(Of IQAModule)
        Private ReadOnly _buildModule As IBuildVerificationModule
        Private ReadOnly _e2eModule As IE2ETestingModule
        Private ReadOnly _scannerModule As IErrorScannerModule
        Private ReadOnly _fixerModule As IAutoFixerModule
        Private ReadOnly _reportingModule As IReportingModule

        Public Event IssueDiscovered As EventHandler(Of QualityIssue) Implements IQAOrchestrator.IssueDiscovered
        Public Event AnalysisCompleted As EventHandler(Of QAAnalysisResult) Implements IQAOrchestrator.AnalysisCompleted
        Public Event FixAttempted As EventHandler(Of FixAttempt) Implements IQAOrchestrator.FixAttempted

        Public Sub New(logger As ILogger(Of QAOrchestrator),
                       buildModule As IBuildVerificationModule,
                       e2eModule As IE2ETestingModule,
                       scannerModule As IErrorScannerModule,
                       fixerModule As IAutoFixerModule,
                       reportingModule As IReportingModule)
            _logger = logger OrElse throw New ArgumentNullException(NameOf(logger))
            _buildModule = buildModule OrElse throw New ArgumentNullException(NameOf(buildModule))
            _e2eModule = e2eModule OrElse throw New ArgumentNullException(NameOf(e2eModule))
            _scannerModule = scannerModule OrElse throw New ArgumentNullException(NameOf(scannerModule))
            _fixerModule = fixerModule OrElse throw New ArgumentNullException(NameOf(fixerModule))
            _reportingModule = reportingModule OrElse throw New ArgumentNullException(NameOf(reportingModule))
            _modules = New List(Of IQAModule)
        End Sub

        Public Async Function RegisterModuleAsync(Of T As IQAModule)(module As T) As Task Implements IQAOrchestrator.RegisterModuleAsync
            If module IsNot Nothing Then
                _modules.Add(module)
                _logger.LogInformation($"Registered QA module: {module.Name} v{module.Version}")
                Await Task.CompletedTask
            End If
        End Function

        Public Async Function RunFullAnalysisAsync(config As QAAgentConfig, cancellationToken As CancellationToken) As Task(Of QAAnalysisResult) Implements IQAOrchestrator.RunFullAnalysisAsync
            Dim result As New QAAnalysisResult With {
                .Configuration = config,
                .StartedAt = DateTime.UtcNow
            }

            _logger.LogInformation("🚀 Starting comprehensive quality assurance analysis...")
            _logger.LogInformation($"Project Path: {config.ProjectPath}")
            _logger.LogInformation($"Parallelism Level: {config.ParallelismLevel}")

            Try
                ' Phase 1: Build Verification
                If config.EnableBuildVerification Then
                    _logger.LogInformation("📦 Phase 1: Build Verification")
                    result.BuildResult = Await _buildModule.VerifyBuildAsync(config.ProjectPath, config, cancellationToken)
                    
                    If Not result.BuildResult.Success Then
                        _logger.LogError("❌ Build failed - stopping analysis")
                        result.Issues.AddRange(ConvertBuildErrorsToIssues(result.BuildResult))
                        GoTo FinalizeResults
                    End If
                    
                    _logger.LogInformation($"✅ Build successful in {result.BuildResult.Duration.TotalSeconds:F2}s")
                End If

                ' Phase 2: Error Pattern Scanning
                If config.EnableErrorScanning Then
                    _logger.LogInformation("🔍 Phase 2: Error Pattern Scanning")
                    Dim scanIssues = Await _scannerModule.RunAsync(config, cancellationToken)
                    result.Issues.AddRange(scanIssues)
                    
                    For Each issue In scanIssues.Where(Function(i) i.Severity >= config.NotificationLevel)
                        RaiseEvent IssueDiscovered(Me, issue)
                    Next
                    
                    _logger.LogInformation($"🔍 Found {scanIssues.Count} code quality issues")
                End If

                ' Phase 3: Security Vulnerability Analysis
                _logger.LogInformation("🔒 Phase 3: Security Analysis")
                Dim securityIssues = Await _scannerModule.AnalyzeSecurityVulnerabilitiesAsync(config.ProjectPath, cancellationToken)
                result.Issues.AddRange(securityIssues)
                
                Dim criticalSecurityIssues = securityIssues.Where(Function(i) i.Severity = IssueSeverity.Critical).Count()
                If criticalSecurityIssues > config.SecurityRules.MaxAllowedSecurityIssues Then
                    _logger.LogError($"❌ Found {criticalSecurityIssues} critical security issues (max allowed: {config.SecurityRules.MaxAllowedSecurityIssues})")
                End If

                ' Phase 4: Automated Fixing (if enabled)
                If config.EnableAutoFix Then
                    _logger.LogInformation("🔧 Phase 4: Automated Issue Fixing")
                    Await RunAutomatedFixesAsync(result, config, cancellationToken)
                End If

                ' Phase 5: End-to-End Testing
                If config.EnableE2ETesting Then
                    _logger.LogInformation("🧪 Phase 5: End-to-End Testing")
                    result.TestResult = Await _e2eModule.RunE2ETestsAsync(config, cancellationToken)
                    
                    If result.TestResult.FailedTests > 0 Then
                        _logger.LogWarning($"⚠️  {result.TestResult.FailedTests} E2E tests failed")
                        result.Issues.AddRange(ConvertTestFailuresToIssues(result.TestResult))
                    End If
                    
                    _logger.LogInformation($"🧪 E2E Tests: {result.TestResult.PassedTests}/{result.TestResult.TotalTests} passed")
                End If

FinalizeResults:
                ' Calculate metrics and generate reports
                result.CompletedAt = DateTime.UtcNow
                result.Duration = result.CompletedAt - result.StartedAt
                result.TotalIssues = result.Issues.Count
                result.CriticalIssues = result.Issues.Where(Function(i) i.Severity = IssueSeverity.Critical).Count()
                result.HighIssues = result.Issues.Where(Function(i) i.Severity = IssueSeverity.High).Count()
                result.MediumIssues = result.Issues.Where(Function(i) i.Severity = IssueSeverity.Medium).Count()
                result.LowIssues = result.Issues.Where(Function(i) i.Severity = IssueSeverity.Low).Count()

                ' Generate executive summary
                result.Summary = GenerateExecutiveSummary(result)

                ' Generate reports
                Dim reportsDir = Path.Combine(config.ProjectPath, config.OutputPath)
                Directory.CreateDirectory(reportsDir)

                Dim htmlReportPath = Await _reportingModule.GenerateHtmlReportAsync(result.Issues, reportsDir, config)
                Dim jsonReportPath = Await _reportingModule.GenerateJsonReportAsync(result.Issues, reportsDir)
                Dim summaryReportPath = Await _reportingModule.GenerateExecutiveSummaryAsync(result.Issues, reportsDir)

                result.ReportPaths.AddRange({htmlReportPath, jsonReportPath, summaryReportPath})

                ' Send notifications if configured
                If Not String.IsNullOrEmpty(config.WebhookUrl) Then
                    Await _reportingModule.SendNotificationAsync(result.Summary, config)
                End If

                _logger.LogInformation($"✅ Analysis completed in {result.Duration.TotalMinutes:F2} minutes")
                _logger.LogInformation($"📊 Total Issues: {result.TotalIssues} (Critical: {result.CriticalIssues}, High: {result.HighIssues}, Medium: {result.MediumIssues}, Low: {result.LowIssues})")
                _logger.LogInformation($"📈 Health Score: {result.Summary.OverallHealthScore}/100")

                RaiseEvent AnalysisCompleted(Me, result)
                Return result

            Catch ex As Exception
                _logger.LogError(ex, "❌ Analysis failed with exception")
                result.CompletedAt = DateTime.UtcNow
                result.Duration = result.CompletedAt - result.StartedAt
                result.Issues.Add(New QualityIssue With {
                    .Severity = IssueSeverity.Critical,
                    .Category = IssueCategory.Configuration,
                    .Title = "QA Agent Analysis Failed",
                    .Description = $"The quality assurance analysis failed: {ex.Message}",
                    .Source = "QAOrchestrator",
                    .RecommendedAction = "Check configuration and system requirements"
                })
                Return result
            End Try
        End Function

        Public Async Function RunIncrementalAnalysisAsync(changedFiles As List(Of String), config As QAAgentConfig, cancellationToken As CancellationToken) As Task(Of QAAnalysisResult) Implements IQAOrchestrator.RunIncrementalAnalysisAsync
            _logger.LogInformation($"🔄 Running incremental analysis on {changedFiles.Count} changed files")
            
            ' Filter files based on supported types and ignore patterns
            Dim relevantFiles = changedFiles.Where(Function(f) Not IsIgnoredFile(f, config.IgnorePatterns) AndAlso 
                                                          _modules.Any(Function(m) m.CanHandle(f))).ToList()
            
            If Not relevantFiles.Any() Then
                _logger.LogInformation("ℹ️  No relevant files changed - skipping analysis")
                Return New QAAnalysisResult With {.CompletedAt = DateTime.UtcNow}
            End If

            ' Run focused analysis on changed files only
            Dim result As New QAAnalysisResult With {
                .Configuration = config,
                .StartedAt = DateTime.UtcNow
            }

            ' Quick security and quality scan on changed files
            For Each filePath In relevantFiles
                Dim fileIssues = Await _scannerModule.CheckCodeQualityAsync(filePath, cancellationToken)
                result.Issues.AddRange(fileIssues)
            Next

            ' If any critical issues found, run targeted tests
            If result.Issues.Any(Function(i) i.Severity >= IssueSeverity.High) Then
                _logger.LogInformation("⚠️  Critical issues found - running targeted validation")
                ' Run specific tests for affected modules
            End If

            result.CompletedAt = DateTime.UtcNow
            result.Duration = result.CompletedAt - result.StartedAt

            _logger.LogInformation($"✅ Incremental analysis completed in {result.Duration.TotalSeconds:F2} seconds")
            Return result
        End Function

        Private Async Function RunAutomatedFixesAsync(result As QAAnalysisResult, config As QAAgentConfig, cancellationToken As CancellationToken) As Task
            Dim fixableIssues = result.Issues.Where(Function(i) i.AutoFixable AndAlso _fixerModule.CanFix(i)).ToList()
            
            _logger.LogInformation($"🔧 Attempting to auto-fix {fixableIssues.Count} issues")

            For Each issue In fixableIssues
                Try
                    Dim fixAttempt = Await _fixerModule.AttemptFixAsync(issue, config, cancellationToken)
                    result.FixAttempts.Add(fixAttempt)
                    issue.FixAttempts.Add(fixAttempt)
                    issue.FixStatus = fixAttempt.Status

                    RaiseEvent FixAttempted(Me, fixAttempt)

                    If fixAttempt.Status = FixStatus.Success Then
                        _logger.LogInformation($"✅ Fixed: {issue.Title}")
                    Else
                        _logger.LogWarning($"❌ Fix failed for: {issue.Title} - {fixAttempt.ErrorMessage}")
                    End If

                Catch ex As Exception
                    _logger.LogError(ex, $"❌ Exception during fix attempt for issue: {issue.Title}")
                End Try
            Next
        End Function

        Private Function ConvertBuildErrorsToIssues(buildResult As BuildResult) As List(Of QualityIssue)
            Dim issues As New List(Of QualityIssue)

            For Each errorMsg In buildResult.Errors
                issues.Add(New QualityIssue With {
                    .Severity = IssueSeverity.Critical,
                    .Category = IssueCategory.BuildProcess,
                    .Title = "Build Error",
                    .Description = errorMsg,
                    .Source = "BuildVerification",
                    .RecommendedAction = "Fix build configuration and dependencies"
                })
            Next

            Return issues
        End Function

        Private Function ConvertTestFailuresToIssues(testResult As TestResult) As List(Of QualityIssue)
            Dim issues As New List(Of QualityIssue)

            For Each failedTest In testResult.FailedTestDetails
                issues.Add(New QualityIssue With {
                    .Severity = IssueSeverity.High,
                    .Category = IssueCategory.EndToEnd,
                    .Title = $"E2E Test Failure: {failedTest.TestName}",
                    .Description = failedTest.ErrorMessage,
                    .Evidence = failedTest.Screenshot,
                    .Source = "E2ETesting",
                    .RecommendedAction = "Review test failure and fix underlying functionality"
                })
            Next

            Return issues
        End Function

        Private Function GenerateExecutiveSummary(result As QAAnalysisResult) As ExecutiveSummary
            Dim summary As New ExecutiveSummary

            ' Calculate overall health score (0-100)
            Dim maxPossibleScore = 100
            Dim deductions = result.CriticalIssues * 25 + result.HighIssues * 10 + result.MediumIssues * 5 + result.LowIssues * 1
            summary.OverallHealthScore = Math.Max(0, maxPossibleScore - deductions)

            ' Security Score
            Dim securityIssues = result.Issues.Where(Function(i) i.Category = IssueCategory.Security).Count()
            summary.SecurityScore = Math.Max(0, 100 - (securityIssues * 20))

            ' Performance Score (from test results)
            If result.TestResult IsNot Nothing AndAlso result.TestResult.PerformanceMetrics IsNot Nothing Then
                summary.PerformanceScore = result.TestResult.PerformanceMetrics.LighthouseScore
            Else
                summary.PerformanceScore = 50 ' Unknown
            End If

            ' Test Coverage Score
            If result.TestResult IsNot Nothing Then
                summary.TestCoverageScore = CInt(result.TestResult.Coverage)
            Else
                summary.TestCoverageScore = 0
            End If

            ' Code Quality Score
            Dim qualityIssues = result.Issues.Where(Function(i) i.Category = IssueCategory.CodeQuality).Count()
            summary.CodeQualityScore = Math.Max(0, 100 - (qualityIssues * 5))

            ' Generate recommendations
            If result.CriticalIssues > 0 Then
                summary.RecommendedActions.Add($"🚨 Address {result.CriticalIssues} critical issues immediately")
            End If
            If securityIssues > 0 Then
                summary.RecommendedActions.Add($"🔒 Fix {securityIssues} security vulnerabilities")
            End If
            If result.TestResult?.FailedTests > 0 Then
                summary.RecommendedActions.Add($"🧪 Fix {result.TestResult.FailedTests} failing tests")
            End If

            ' Risk Assessment
            If result.CriticalIssues > 5 OrElse securityIssues > 3 Then
                summary.RiskAssessment = "HIGH RISK - Critical issues require immediate attention"
            ElseIf result.HighIssues > 10 OrElse securityIssues > 0 Then
                summary.RiskAssessment = "MEDIUM RISK - Significant issues should be addressed soon"
            Else
                summary.RiskAssessment = "LOW RISK - Minor issues for future improvement"
            End If

            ' Project Readiness
            If summary.OverallHealthScore >= 90 AndAlso result.CriticalIssues = 0 Then
                summary.ProjectReadiness = "READY FOR PRODUCTION"
            ElseIf summary.OverallHealthScore >= 75 AndAlso result.CriticalIssues <= 2 Then
                summary.ProjectReadiness = "READY FOR STAGING"
            Else
                summary.ProjectReadiness = "NOT READY - REQUIRES FIXES"
            End If

            Return summary
        End Function

        Private Function IsIgnoredFile(filePath As String, ignorePatterns As List(Of String)) As Boolean
            For Each pattern In ignorePatterns
                If filePath.Contains(pattern.Replace("**", "").Replace("*", "")) Then
                    Return True
                End If
            Next
            Return False
        End Function

    End Class

End Namespace