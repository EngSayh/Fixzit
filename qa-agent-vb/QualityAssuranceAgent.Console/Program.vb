Imports System.CommandLine
Imports Microsoft.Extensions.DependencyInjection
Imports Microsoft.Extensions.Hosting
Imports Microsoft.Extensions.Logging
Imports Serilog
Imports QualityAssuranceAgent.Core.Models
Imports QualityAssuranceAgent.Core.Services
Imports QualityAssuranceAgent.Core.Interfaces
Imports QualityAssuranceAgent.BuildVerification
Imports QualityAssuranceAgent.E2ETesting

Namespace QualityAssuranceAgent.Console

    ''' <summary>
    ''' Main console application for the Fixzit Quality Assurance Agent
    ''' </summary>
    Public Class Program

        Public Shared Async Function Main(args As String()) As Task(Of Integer)
            Try
                ' Configure Serilog
                Log.Logger = New LoggerConfiguration() _
                    .WriteTo.Console() _
                    .WriteTo.File("qa-agent-logs-.txt", rollingInterval:=RollingInterval.Day) _
                    .CreateLogger()

                Log.Information("🚀 Fixzit Quality Assurance Agent starting...")

                ' Setup command line interface
                Dim rootCommand = CreateRootCommand()
                Return Await rootCommand.InvokeAsync(args)

            Catch ex As Exception
                Log.Fatal(ex, "💥 Application terminated unexpectedly")
                Return 1
            Finally
                Log.CloseAndFlush()
            End Try
        End Function

        Private Shared Function CreateRootCommand() As RootCommand
            Dim rootCommand As New RootCommand("Fixzit Quality Assurance Agent - Comprehensive automated testing and quality analysis")

            ' Global options
            Dim projectPathOption As New Option(Of String)(
                aliases:={"--project", "-p"},
                description:="Path to the project to analyze",
                getDefaultValue:=Function() Environment.CurrentDirectory
            )

            Dim configFileOption As New Option(Of String)(
                aliases:={"--config", "-c"},
                description:="Path to configuration file",
                getDefaultValue:=Function() "qa-config.json"
            )

            Dim outputPathOption As New Option(Of String)(
                aliases:={"--output", "-o"},
                description:="Output directory for reports",
                getDefaultValue:=Function() "qa-reports"
            )

            Dim verboseOption As New Option(Of Boolean)(
                aliases:={"--verbose", "-v"},
                description:="Enable verbose logging"
            )

            ' Add global options
            rootCommand.AddOption(projectPathOption)
            rootCommand.AddOption(configFileOption)
            rootCommand.AddOption(outputPathOption)
            rootCommand.AddOption(verboseOption)

            ' Full analysis command
            Dim fullAnalysisCommand As New Command("analyze", "Run comprehensive quality analysis")
            fullAnalysisCommand.SetHandler(
                Async Function(projectPath As String, configFile As String, outputPath As String, verbose As Boolean)
                    Await RunFullAnalysis(projectPath, configFile, outputPath, verbose)
                End Function,
                projectPathOption, configFileOption, outputPathOption, verboseOption
            )

            ' Build verification only
            Dim buildCommand As New Command("build", "Run build verification only")
            buildCommand.SetHandler(
                Async Function(projectPath As String, configFile As String, outputPath As String, verbose As Boolean)
                    Await RunBuildVerification(projectPath, configFile, outputPath, verbose)
                End Function,
                projectPathOption, configFileOption, outputPathOption, verboseOption
            )

            ' E2E testing only
            Dim e2eCommand As New Command("e2e", "Run E2E tests only")
            e2eCommand.SetHandler(
                Async Function(projectPath As String, configFile As String, outputPath As String, verbose As Boolean)
                    Await RunE2ETests(projectPath, configFile, outputPath, verbose)
                End Function,
                projectPathOption, configFileOption, outputPathOption, verboseOption
            )

            ' Incremental analysis
            Dim incrementalCommand As New Command("incremental", "Run analysis on changed files only")
            Dim changedFilesOption As New Option(Of String())(
                aliases:={"--files", "-f"},
                description:="List of changed files to analyze"
            ) With {.AllowMultipleArgumentsPerToken = True}
            incrementalCommand.AddOption(changedFilesOption)
            incrementalCommand.SetHandler(
                Async Function(projectPath As String, configFile As String, outputPath As String, verbose As Boolean, changedFiles As String())
                    Await RunIncrementalAnalysis(projectPath, configFile, outputPath, verbose, changedFiles?.ToList() ?? New List(Of String))
                End Function,
                projectPathOption, configFileOption, outputPathOption, verboseOption, changedFilesOption
            )

            ' Configuration generation
            Dim initCommand As New Command("init", "Generate default configuration file")
            initCommand.SetHandler(
                Async Function(projectPath As String, configFile As String, outputPath As String, verbose As Boolean)
                    Await GenerateDefaultConfig(projectPath, configFile)
                End Function,
                projectPathOption, configFileOption, outputPathOption, verboseOption
            )

            rootCommand.AddCommand(fullAnalysisCommand)
            rootCommand.AddCommand(buildCommand)
            rootCommand.AddCommand(e2eCommand)
            rootCommand.AddCommand(incrementalCommand)
            rootCommand.AddCommand(initCommand)

            Return rootCommand
        End Function

        Private Shared Async Function RunFullAnalysis(projectPath As String, configFile As String, outputPath As String, verbose As Boolean) As Task
            Using host = CreateHost(verbose)
                Dim logger = host.Services.GetRequiredService(Of ILogger(Of Program))()
                Dim orchestrator = host.Services.GetRequiredService(Of IQAOrchestrator)()

                logger.LogInformation("🔍 Starting comprehensive quality analysis...")

                ' Load configuration
                Dim config = Await LoadConfiguration(configFile, projectPath, outputPath, logger)

                ' Run analysis
                Using cts As New Threading.CancellationTokenSource(TimeSpan.FromHours(1))
                    Dim result = Await orchestrator.RunFullAnalysisAsync(config, cts.Token)
                    
                    ' Display results
                    DisplayResults(result, logger)
                End Using
            End Using
        End Function

        Private Shared Async Function RunBuildVerification(projectPath As String, configFile As String, outputPath As String, verbose As Boolean) As Task
            Using host = CreateHost(verbose)
                Dim logger = host.Services.GetRequiredService(Of ILogger(Of Program))()
                Dim buildModule = host.Services.GetRequiredService(Of IBuildVerificationModule)()

                logger.LogInformation("🏗️  Starting build verification...")

                Dim config = Await LoadConfiguration(configFile, projectPath, outputPath, logger)
                config.EnableE2ETesting = False
                config.EnableAutoFix = False

                Using cts As New Threading.CancellationTokenSource(config.BuildTimeout)
                    Dim buildResult = Await buildModule.VerifyBuildAsync(projectPath, config, cts.Token)
                    
                    If buildResult.Success Then
                        logger.LogInformation($"✅ Build successful in {buildResult.Duration.TotalSeconds:F2}s")
                        logger.LogInformation($"📊 Build size: {buildResult.BuildSize / 1024 / 1024:F2} MB")
                    Else
                        logger.LogError("❌ Build failed!")
                        For Each errorMsg In buildResult.Errors
                            logger.LogError($"   {errorMsg}")
                        Next
                    End If
                End Using
            End Using
        End Function

        Private Shared Async Function RunE2ETests(projectPath As String, configFile As String, outputPath As String, verbose As Boolean) As Task
            Using host = CreateHost(verbose)
                Dim logger = host.Services.GetRequiredService(Of ILogger(Of Program))()
                Dim e2eModule = host.Services.GetRequiredService(Of IE2ETestingModule)()

                logger.LogInformation("🧪 Starting E2E tests...")

                Dim config = Await LoadConfiguration(configFile, projectPath, outputPath, logger)
                config.EnableBuildVerification = False
                config.EnableAutoFix = False

                Using cts As New Threading.CancellationTokenSource(config.TestTimeout)
                    Dim testResult = Await e2eModule.RunE2ETestsAsync(config, cts.Token)
                    
                    logger.LogInformation($"🧪 E2E Tests completed: {testResult.PassedTests}/{testResult.TotalTests} passed in {testResult.Duration.TotalMinutes:F2}m")
                    
                    If testResult.FailedTests > 0 Then
                        logger.LogWarning($"⚠️  {testResult.FailedTests} tests failed:")
                        For Each failedTest In testResult.FailedTestDetails
                            logger.LogError($"   ❌ {failedTest.TestName}: {failedTest.ErrorMessage}")
                        Next
                    End If

                    ' Generate test report
                    Directory.CreateDirectory(outputPath)
                    Await e2eModule.GenerateTestReportAsync(testResult, outputPath)
                End Using
            End Using
        End Function

        Private Shared Async Function RunIncrementalAnalysis(projectPath As String, configFile As String, outputPath As String, verbose As Boolean, changedFiles As List(Of String)) As Task
            Using host = CreateHost(verbose)
                Dim logger = host.Services.GetRequiredService(Of ILogger(Of Program))()
                Dim orchestrator = host.Services.GetRequiredService(Of IQAOrchestrator)()

                logger.LogInformation($"🔄 Starting incremental analysis on {changedFiles.Count} files...")

                Dim config = Await LoadConfiguration(configFile, projectPath, outputPath, logger)

                Using cts As New Threading.CancellationTokenSource(TimeSpan.FromMinutes(15))
                    Dim result = Await orchestrator.RunIncrementalAnalysisAsync(changedFiles, config, cts.Token)
                    DisplayResults(result, logger)
                End Using
            End Using
        End Function

        Private Shared Async Function GenerateDefaultConfig(projectPath As String, configFile As String) As Task
            Dim defaultConfig As New QAAgentConfig With {
                .ProjectPath = projectPath,
                .OutputPath = "qa-reports",
                .LogLevel = LogLevel.Information,
                .EnableAutoFix = False,
                .EnableE2ETesting = True,
                .EnableBuildVerification = True,
                .EnableErrorScanning = True,
                .TestTimeout = TimeSpan.FromMinutes(30),
                .BuildTimeout = TimeSpan.FromMinutes(10),
                .SecurityRules = New SecurityConfig With {
                    .EnableSecurityScanning = True,
                    .RequireHttpsOnly = True,
                    .RequireAuthenticationOnApiRoutes = True,
                    .MaxAllowedSecurityIssues = 0
                },
                .PerformanceRules = New PerformanceConfig With {
                    .MaxPageLoadTimeMs = 3000,
                    .MaxApiResponseTimeMs = 1000,
                    .MinLighthouseScore = 90
                }
            }

            Dim json = Text.Json.JsonSerializer.Serialize(defaultConfig, New Text.Json.JsonSerializerOptions With {
                .WriteIndented = True
            })

            Await File.WriteAllTextAsync(configFile, json)
            Console.WriteLine($"✅ Generated default configuration at: {Path.GetFullPath(configFile)}")
        End Function

        Private Shared Function CreateHost(verbose As Boolean) As IHost
            Return Host.CreateDefaultBuilder() _
                .ConfigureServices(Sub(services)
                    ' Core services
                    services.AddSingleton(Of QAOrchestrator)()
                    services.AddSingleton(Of IQAOrchestrator)(Function(sp) sp.GetRequiredService(Of QAOrchestrator)())
                    
                    ' Modules
                    services.AddSingleton(Of IBuildVerificationModule, NextJSBuildVerificationModule)()
                    services.AddSingleton(Of IE2ETestingModule, PlaywrightE2ETestingModule)()
                    
                    ' Mock implementations for now (would be implemented in other modules)
                    services.AddSingleton(Of IErrorScannerModule, MockErrorScannerModule)()
                    services.AddSingleton(Of IAutoFixerModule, MockAutoFixerModule)()
                    services.AddSingleton(Of IReportingModule, MockReportingModule)()
                End Sub) _
                .UseSerilog() _
                .Build()
        End Function

        Private Shared Async Function LoadConfiguration(configFile As String, projectPath As String, outputPath As String, logger As ILogger) As Task(Of QAAgentConfig)
            Try
                If File.Exists(configFile) Then
                    logger.LogInformation($"📄 Loading configuration from: {configFile}")
                    Dim json = Await File.ReadAllTextAsync(configFile)
                    Dim config = Text.Json.JsonSerializer.Deserialize(Of QAAgentConfig)(json)
                    config.ProjectPath = projectPath
                    config.OutputPath = outputPath
                    Return config
                Else
                    logger.LogWarning($"⚠️  Configuration file not found: {configFile}. Using defaults.")
                    Return New QAAgentConfig With {
                        .ProjectPath = projectPath,
                        .OutputPath = outputPath
                    }
                End If
            Catch ex As Exception
                logger.LogError(ex, $"❌ Failed to load configuration: {ex.Message}")
                logger.LogInformation("Using default configuration...")
                Return New QAAgentConfig With {
                    .ProjectPath = projectPath,
                    .OutputPath = outputPath
                }
            End Try
        End Function

        Private Shared Sub DisplayResults(result As QAAnalysisResult, logger As ILogger)
            logger.LogInformation("")
            logger.LogInformation("📊 ===== ANALYSIS RESULTS =====")
            logger.LogInformation($"⏱️  Duration: {result.Duration.TotalMinutes:F2} minutes")
            logger.LogInformation($"📋 Total Issues: {result.TotalIssues}")
            logger.LogInformation($"🚨 Critical: {result.CriticalIssues}")
            logger.LogInformation($"⚠️  High: {result.HighIssues}")
            logger.LogInformation($"📝 Medium: {result.MediumIssues}")
            logger.LogInformation($"ℹ️  Low: {result.LowIssues}")

            If result.Summary IsNot Nothing Then
                logger.LogInformation($"📈 Health Score: {result.Summary.OverallHealthScore}/100")
                logger.LogInformation($"🔒 Security Score: {result.Summary.SecurityScore}/100")
                logger.LogInformation($"⚡ Performance Score: {result.Summary.PerformanceScore}/100")
                logger.LogInformation($"🧪 Test Coverage: {result.Summary.TestCoverageScore}%")
                logger.LogInformation($"✨ Code Quality Score: {result.Summary.CodeQualityScore}/100")
                logger.LogInformation($"🚀 Project Status: {result.Summary.ProjectReadiness}")
                logger.LogInformation($"⚖️  Risk Level: {result.Summary.RiskAssessment}")
            End If

            If result.ReportPaths?.Any() Then
                logger.LogInformation("")
                logger.LogInformation("📄 Reports generated:")
                For Each reportPath In result.ReportPaths
                    logger.LogInformation($"   📋 {reportPath}")
                Next
            End If

            If result.CriticalIssues > 0 Then
                logger.LogInformation("")
                logger.LogError("🚨 CRITICAL ISSUES FOUND - IMMEDIATE ACTION REQUIRED")
                For Each issue In result.Issues.Where(Function(i) i.Severity = IssueSeverity.Critical).Take(5)
                    logger.LogError($"   ❌ {issue.Title}: {issue.Description}")
                Next
            End If
            
            logger.LogInformation("📊 ============================")
        End Sub

    End Class

    ' Mock implementations (would be in separate modules in full implementation)
    Public Class MockErrorScannerModule
        Implements IErrorScannerModule

        Public ReadOnly Property Name As String = "Mock Error Scanner" Implements IQAModule.Name
        Public ReadOnly Property Version As String = "1.0.0" Implements IQAModule.Version
        Public ReadOnly Property SupportedFileTypes As IReadOnlyList(Of String) = {"*"}.ToList() Implements IQAModule.SupportedFileTypes

        Public Function CanHandle(filePath As String) As Boolean Implements IQAModule.CanHandle
            Return True
        End Function

        Public Async Function RunAsync(config As QAAgentConfig, cancellationToken As Threading.CancellationToken) As Task(Of List(Of QualityIssue)) Implements IQAModule.RunAsync
            Await Task.Delay(100, cancellationToken)
            Return New List(Of QualityIssue)
        End Function

        Public Async Function ScanForErrorPatternsAsync(projectPath As String, config As QAAgentConfig, cancellationToken As Threading.CancellationToken) As Task(Of List(Of QualityIssue)) Implements IErrorScannerModule.ScanForErrorPatternsAsync
            Await Task.Delay(100, cancellationToken)
            Return New List(Of QualityIssue)
        End Function

        Public Async Function AnalyzeSecurityVulnerabilitiesAsync(projectPath As String, cancellationToken As Threading.CancellationToken) As Task(Of List(Of QualityIssue)) Implements IErrorScannerModule.AnalyzeSecurityVulnerabilitiesAsync
            Await Task.Delay(100, cancellationToken)
            Return New List(Of QualityIssue)
        End Function

        Public Async Function CheckCodeQualityAsync(projectPath As String, cancellationToken As Threading.CancellationToken) As Task(Of List(Of QualityIssue)) Implements IErrorScannerModule.CheckCodeQualityAsync
            Await Task.Delay(100, cancellationToken)
            Return New List(Of QualityIssue)
        End Function
    End Class

    Public Class MockAutoFixerModule
        Implements IAutoFixerModule

        Public Function CanFix(issue As QualityIssue) As Boolean Implements IAutoFixerModule.CanFix
            Return issue.AutoFixable
        End Function

        Public Async Function AttemptFixAsync(issue As QualityIssue, config As QAAgentConfig, cancellationToken As Threading.CancellationToken) As Task(Of FixAttempt) Implements IAutoFixerModule.AttemptFixAsync
            Await Task.Delay(100, cancellationToken)
            Return New FixAttempt With {.Status = FixStatus.NotAttempted}
        End Function

        Public Async Function ValidateFixAsync(attempt As FixAttempt, cancellationToken As Threading.CancellationToken) As Task(Of Boolean) Implements IAutoFixerModule.ValidateFixAsync
            Await Task.Delay(100, cancellationToken)
            Return True
        End Function

        Public Async Function RollbackChangesAsync(attempt As FixAttempt, cancellationToken As Threading.CancellationToken) As Task Implements IAutoFixerModule.RollbackChangesAsync
            Await Task.Delay(100, cancellationToken)
        End Function
    End Class

    Public Class MockReportingModule
        Implements IReportingModule

        Public Async Function GenerateHtmlReportAsync(issues As List(Of QualityIssue), outputPath As String, config As QAAgentConfig) As Task(Of String) Implements IReportingModule.GenerateHtmlReportAsync
            Dim reportPath = Path.Combine(outputPath, "qa-report.html")
            Await File.WriteAllTextAsync(reportPath, "<html><body><h1>QA Report</h1><p>Generated by Mock Module</p></body></html>")
            Return reportPath
        End Function

        Public Async Function GenerateJsonReportAsync(issues As List(Of QualityIssue), outputPath As String) As Task(Of String) Implements IReportingModule.GenerateJsonReportAsync
            Dim reportPath = Path.Combine(outputPath, "qa-report.json")
            Await File.WriteAllTextAsync(reportPath, Text.Json.JsonSerializer.Serialize(issues))
            Return reportPath
        End Function

        Public Async Function GenerateExecutiveSummaryAsync(issues As List(Of QualityIssue), outputPath As String) As Task(Of String) Implements IReportingModule.GenerateExecutiveSummaryAsync
            Dim summaryPath = Path.Combine(outputPath, "executive-summary.txt")
            Await File.WriteAllTextAsync(summaryPath, $"Executive Summary: {issues.Count} issues found")
            Return summaryPath
        End Function

        Public Async Function SendNotificationAsync(summary As ExecutiveSummary, config As QAAgentConfig) As Task Implements IReportingModule.SendNotificationAsync
            Await Task.Delay(100)
        End Function
    End Class

End Namespace