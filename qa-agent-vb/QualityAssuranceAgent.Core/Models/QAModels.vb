Imports System.ComponentModel
Imports Microsoft.Extensions.Logging

Namespace QualityAssuranceAgent.Core.Models

    ''' <summary>
    ''' Represents the severity level of a quality issue
    ''' </summary>
    Public Enum IssueSeverity
        <Description("Low priority cosmetic or minor issues")>
        Low = 0
        <Description("Medium priority functionality or performance issues")>
        Medium = 1
        <Description("High priority security or critical functionality issues")>
        High = 2
        <Description("Critical system-breaking or security vulnerabilities")>
        Critical = 3
    End Enum

    ''' <summary>
    ''' Represents the category of quality issue found
    ''' </summary>
    Public Enum IssueCategory
        Security
        Performance
        Accessibility
        CodeQuality
        Testing
        Documentation
        Dependencies
        Configuration
        BuildProcess
        EndToEnd
    End Enum

    ''' <summary>
    ''' Represents the status of an automated fix attempt
    ''' </summary>
    Public Enum FixStatus
        NotAttempted
        InProgress
        Success
        Failed
        RequiresManualIntervention
    End Enum

    ''' <summary>
    ''' Core model representing a quality assurance issue found by the agent
    ''' </summary>
    Public Class QualityIssue
        Public Property Id As Guid = Guid.NewGuid()
        Public Property Severity As IssueSeverity
        Public Property Category As IssueCategory
        Public Property Title As String
        Public Property Description As String
        Public Property FilePath As String
        Public Property LineNumber As Integer?
        Public Property ColumnNumber As Integer?
        Public Property Rule As String
        Public Property Source As String ' Which scanner found this issue
        Public Property DiscoveredAt As DateTime = DateTime.UtcNow
        Public Property FixStatus As FixStatus = FixStatus.NotAttempted
        Public Property FixAttempts As List(Of FixAttempt) = New List(Of FixAttempt)
        Public Property Evidence As String ' Code snippet, screenshot, etc.
        Public Property RecommendedAction As String
        Public Property AutoFixable As Boolean
        Public Property Tags As List(Of String) = New List(Of String)
        Public Property RelatedIssues As List(Of Guid) = New List(Of Guid)
    End Class

    ''' <summary>
    ''' Represents an attempt to automatically fix a quality issue
    ''' </summary>
    Public Class FixAttempt
        Public Property Id As Guid = Guid.NewGuid()
        Public Property AttemptedAt As DateTime = DateTime.UtcNow
        Public Property Status As FixStatus
        Public Property Method As String ' What fix strategy was used
        Public Property Changes As List(Of FileChange) = New List(Of FileChange)
        Public Property ErrorMessage As String
        Public Property SuccessMessage As String
        Public Property ExecutionTimeMs As Long
        Public Property ValidatedBy As String ' Which verification method was used
    End Class

    ''' <summary>
    ''' Represents a file change made during an automated fix
    ''' </summary>
    Public Class FileChange
        Public Property FilePath As String
        Public Property ChangeType As String ' Added, Modified, Deleted, Renamed
        Public Property LineStart As Integer?
        Public Property LineEnd As Integer?
        Public Property OriginalContent As String
        Public Property NewContent As String
        Public Property BackupPath As String ' Path to backup of original file
    End Class

    ''' <summary>
    ''' Configuration model for the QA Agent system
    ''' </summary>
    Public Class QAAgentConfig
        Public Property ProjectPath As String = Environment.CurrentDirectory
        Public Property OutputPath As String = "qa-reports"
        Public Property LogLevel As LogLevel = LogLevel.Information
        Public Property ParallelismLevel As Integer = Environment.ProcessorCount
        Public Property EnableAutoFix As Boolean = False
        Public Property EnableE2ETesting As Boolean = True
        Public Property EnableBuildVerification As Boolean = True
        Public Property EnableErrorScanning As Boolean = True
        Public Property TestTimeout As TimeSpan = TimeSpan.FromMinutes(30)
        Public Property BuildTimeout As TimeSpan = TimeSpan.FromMinutes(10)
        Public Property ScanTimeout As TimeSpan = TimeSpan.FromMinutes(5)
        Public Property WebhookUrl As String
        Public Property NotificationLevel As IssueSeverity = IssueSeverity.Medium
        Public Property IgnorePatterns As List(Of String) = New List(Of String) From {
            "**/node_modules/**",
            "**/bin/**",
            "**/obj/**",
            "**/.next/**",
            "**/coverage/**"
        }
        Public Property SecurityRules As SecurityConfig = New SecurityConfig()
        Public Property PerformanceRules As PerformanceConfig = New PerformanceConfig()
        Public Property TestingRules As TestingConfig = New TestingConfig()
    End Class

    ''' <summary>
    ''' Security-specific configuration
    ''' </summary>
    Public Class SecurityConfig
        Public Property EnableSecurityScanning As Boolean = True
        Public Property CheckDependencyVulnerabilities As Boolean = True
        Public Property RequireHttpsOnly As Boolean = True
        Public Property RequireAuthenticationOnApiRoutes As Boolean = True
        Public Property RequireInputValidation As Boolean = True
        Public Property RequireTenantIsolation As Boolean = True
        Public Property CheckForSecretLeakage As Boolean = True
        Public Property MaxAllowedSecurityIssues As Integer = 0
    End Class

    ''' <summary>
    ''' Performance-specific configuration
    ''' </summary>
    Public Class PerformanceConfig
        Public Property EnablePerformanceTesting As Boolean = True
        Public Property MaxPageLoadTimeMs As Integer = 3000
        Public Property MaxApiResponseTimeMs As Integer = 1000
        Public Property MinLighthouseScore As Integer = 90
        Public Property EnableBundleAnalysis As Boolean = True
        Public Property MaxBundleSizeMB As Double = 5.0
    End Class

    ''' <summary>
    ''' Testing-specific configuration
    ''' </summary>
    Public Class TestingConfig
        Public Property RequireUnitTests As Boolean = True
        Public Property MinCodeCoverage As Double = 80.0
        Public Property RequireE2ETests As Boolean = True
        Public Property RequireIntegrationTests As Boolean = True
        Public Property TestParallelism As Integer = 4
        Public Property EnableVisualRegression As Boolean = True
    End Class

End Namespace