Imports System.Threading
Imports Microsoft.Extensions.Logging
Imports QualityAssuranceAgent.Core.Models

Namespace QualityAssuranceAgent.Core.Interfaces

    ''' <summary>
    ''' Core interface for all QA Agent modules
    ''' </summary>
    Public Interface IQAModule
        ReadOnly Property Name As String
        ReadOnly Property Version As String
        ReadOnly Property SupportedFileTypes As IReadOnlyList(Of String)
        Function RunAsync(config As QAAgentConfig, cancellationToken As CancellationToken) As Task(Of List(Of QualityIssue))
        Function CanHandle(filePath As String) As Boolean
    End Interface

    ''' <summary>
    ''' Interface for build verification module
    ''' </summary>
    Public Interface IBuildVerificationModule
        Inherits IQAModule
        Function VerifyBuildAsync(projectPath As String, config As QAAgentConfig, cancellationToken As CancellationToken) As Task(Of BuildResult)
        Function AnalyzeDependenciesAsync(projectPath As String, cancellationToken As CancellationToken) As Task(Of DependencyAnalysisResult)
        Function CheckConfigurationAsync(projectPath As String, cancellationToken As CancellationToken) As Task(Of List(Of QualityIssue))
    End Interface

    ''' <summary>
    ''' Interface for end-to-end testing module
    ''' </summary>
    Public Interface IE2ETestingModule
        Inherits IQAModule
        Function RunE2ETestsAsync(config As QAAgentConfig, cancellationToken As CancellationToken) As Task(Of TestResult)
        Function GenerateTestReportAsync(results As TestResult, outputPath As String) As Task
        Function CaptureScreenshotsAsync(testName As String, outputPath As String) As Task(Of List(Of String))
    End Interface

    ''' <summary>
    ''' Interface for error pattern scanning module
    ''' </summary>
    Public Interface IErrorScannerModule
        Inherits IQAModule
        Function ScanForErrorPatternsAsync(projectPath As String, config As QAAgentConfig, cancellationToken As CancellationToken) As Task(Of List(Of QualityIssue))
        Function AnalyzeSecurityVulnerabilitiesAsync(projectPath As String, cancellationToken As CancellationToken) As Task(Of List(Of QualityIssue))
        Function CheckCodeQualityAsync(projectPath As String, cancellationToken As CancellationToken) As Task(Of List(Of QualityIssue))
    End Interface

    ''' <summary>
    ''' Interface for automated fixing module
    ''' </summary>
    Public Interface IAutoFixerModule
        Function CanFix(issue As QualityIssue) As Boolean
        Function AttemptFixAsync(issue As QualityIssue, config As QAAgentConfig, cancellationToken As CancellationToken) As Task(Of FixAttempt)
        Function ValidateFixAsync(attempt As FixAttempt, cancellationToken As CancellationToken) As Task(Of Boolean)
        Function RollbackChangesAsync(attempt As FixAttempt, cancellationToken As CancellationToken) As Task
    End Interface

    ''' <summary>
    ''' Interface for reporting and dashboard generation
    ''' </summary>
    Public Interface IReportingModule
        Function GenerateHtmlReportAsync(issues As List(Of QualityIssue), outputPath As String, config As QAAgentConfig) As Task(Of String)
        Function GenerateJsonReportAsync(issues As List(Of QualityIssue), outputPath As String) As Task(Of String)
        Function GenerateExecutiveSummaryAsync(issues As List(Of QualityIssue), outputPath As String) As Task(Of String)
        Function SendNotificationAsync(summary As ExecutiveSummary, config As QAAgentConfig) As Task
    End Interface

    ''' <summary>
    ''' Main orchestrator interface for the QA Agent system
    ''' </summary>
    Public Interface IQAOrchestrator
        Function RegisterModuleAsync(Of T As IQAModule)(module As T) As Task
        Function RunFullAnalysisAsync(config As QAAgentConfig, cancellationToken As CancellationToken) As Task(Of QAAnalysisResult)
        Function RunIncrementalAnalysisAsync(changedFiles As List(Of String), config As QAAgentConfig, cancellationToken As CancellationToken) As Task(Of QAAnalysisResult)
        Event IssueDiscovered As EventHandler(Of QualityIssue)
        Event AnalysisCompleted As EventHandler(Of QAAnalysisResult)
        Event FixAttempted As EventHandler(Of FixAttempt)
    End Interface

End Namespace

Namespace QualityAssuranceAgent.Core.Models

    ''' <summary>
    ''' Result of build verification process
    ''' </summary>
    Public Class BuildResult
        Public Property Success As Boolean
        Public Property Duration As TimeSpan
        Public Property Output As String
        Public Property Errors As List(Of String) = New List(Of String)
        Public Property Warnings As List(Of String) = New List(Of String)
        Public Property ArtifactsGenerated As List(Of String) = New List(Of String)
        Public Property BuildSize As Long ' in bytes
        Public Property Dependencies As DependencyAnalysisResult
    End Class

    ''' <summary>
    ''' Result of dependency analysis
    ''' </summary>
    Public Class DependencyAnalysisResult
        Public Property TotalDependencies As Integer
        Public Property OutdatedDependencies As List(Of OutdatedDependency) = New List(Of OutdatedDependency)
        Public Property VulnerableDependencies As List(Of VulnerableDependency) = New List(Of VulnerableDependency)
        Public Property UnusedDependencies As List(Of String) = New List(Of String)
        Public Property LicenseIssues As List(Of LicenseIssue) = New List(Of LicenseIssue)
    End Class

    ''' <summary>
    ''' Information about an outdated dependency
    ''' </summary>
    Public Class OutdatedDependency
        Public Property Name As String
        Public Property CurrentVersion As String
        Public Property LatestVersion As String
        Public Property UpdateType As String ' major, minor, patch
        Public Property BreakingChanges As Boolean
    End Class

    ''' <summary>
    ''' Information about a vulnerable dependency
    ''' </summary>
    Public Class VulnerableDependency
        Public Property Name As String
        Public Property Version As String
        Public Property VulnerabilityId As String ' CVE ID
        Public Property Severity As String
        Public Property Description As String
        Public Property FixedInVersion As String
    End Class

    ''' <summary>
    ''' Information about a license compatibility issue
    ''' </summary>
    Public Class LicenseIssue
        Public Property DependencyName As String
        Public Property License As String
        Public Property Issue As String
        Public Property Recommendation As String
    End Class

    ''' <summary>
    ''' Result of E2E test execution
    ''' </summary>
    Public Class TestResult
        Public Property TestSuite As String
        Public Property TotalTests As Integer
        Public Property PassedTests As Integer
        Public Property FailedTests As Integer
        Public Property SkippedTests As Integer
        Public Property Duration As TimeSpan
        Public Property Coverage As Double
        Public Property FailedTestDetails As List(Of FailedTest) = New List(Of FailedTest)
        Public Property Screenshots As List(Of String) = New List(Of String)
        Public Property PerformanceMetrics As PerformanceMetrics
    End Class

    ''' <summary>
    ''' Details about a failed test
    ''' </summary>
    Public Class FailedTest
        Public Property TestName As String
        Public Property ErrorMessage As String
        Public Property StackTrace As String
        Public Property Screenshot As String
        Public Property Duration As TimeSpan
        Public Property RetryCount As Integer
    End Class

    ''' <summary>
    ''' Performance metrics collected during testing
    ''' </summary>
    Public Class PerformanceMetrics
        Public Property PageLoadTime As TimeSpan
        Public Property FirstContentfulPaint As TimeSpan
        Public Property LargestContentfulPaint As TimeSpan
        Public Property CumulativeLayoutShift As Double
        Public Property TimeToInteractive As TimeSpan
        Public Property LighthouseScore As Integer
        Public Property BundleSize As Long
        Public Property ApiResponseTimes As Dictionary(Of String, TimeSpan) = New Dictionary(Of String, TimeSpan)
    End Class

    ''' <summary>
    ''' Complete analysis result from the QA Agent
    ''' </summary>
    Public Class QAAnalysisResult
        Public Property Id As Guid = Guid.NewGuid()
        Public Property StartedAt As DateTime = DateTime.UtcNow
        Public Property CompletedAt As DateTime
        Public Property Duration As TimeSpan
        Public Property TotalIssues As Integer
        Public Property CriticalIssues As Integer
        Public Property HighIssues As Integer
        Public Property MediumIssues As Integer
        Public Property LowIssues As Integer
        Public Property Issues As List(Of QualityIssue) = New List(Of QualityIssue)
        Public Property BuildResult As BuildResult
        Public Property TestResult As TestResult
        Public Property FixAttempts As List(Of FixAttempt) = New List(Of FixAttempt)
        Public Property ReportPaths As List(Of String) = New List(Of String)
        Public Property Summary As ExecutiveSummary
        Public Property Configuration As QAAgentConfig
    End Class

    ''' <summary>
    ''' Executive summary for stakeholders
    ''' </summary>
    Public Class ExecutiveSummary
        Public Property OverallHealthScore As Integer ' 0-100
        Public Property SecurityScore As Integer ' 0-100
        Public Property PerformanceScore As Integer ' 0-100
        Public Property TestCoverageScore As Integer ' 0-100
        Public Property CodeQualityScore As Integer ' 0-100
        Public Property RecommendedActions As List(Of String) = New List(Of String)
        Public Property RiskAssessment As String
        Public Property ProjectReadiness As String
        Public Property KeyMetrics As Dictionary(Of String, Object) = New Dictionary(Of String, Object)
    End Class

End Namespace