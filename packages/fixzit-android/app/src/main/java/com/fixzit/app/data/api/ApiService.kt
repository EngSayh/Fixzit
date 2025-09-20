package com.fixzit.app.data.api

import com.fixzit.app.data.models.*
import retrofit2.Response
import retrofit2.http.*

interface ApiService {
    
    // Authentication
    @POST("api/auth/login")
    suspend fun login(@Body request: LoginRequest): Response<LoginResponse>
    
    @POST("api/auth/logout")
    suspend fun logout(@Header("Authorization") token: String): Response<Unit>
    
    @POST("api/auth/refresh")
    suspend fun refreshToken(@Body request: RefreshTokenRequest): Response<LoginResponse>
    
    @GET("api/auth/profile")
    suspend fun getUserProfile(@Header("Authorization") token: String): Response<User>
    
    // Dashboard
    @GET("api/dashboard/stats")
    suspend fun getDashboardStats(@Header("Authorization") token: String): Response<DashboardStats>
    
    // Properties
    @GET("api/properties")
    suspend fun getProperties(
        @Header("Authorization") token: String,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20,
        @Query("search") search: String? = null,
        @Query("type") type: String? = null,
        @Query("status") status: String? = null
    ): Response<PropertiesResponse>
    
    @GET("api/properties/{id}")
    suspend fun getPropertyDetails(
        @Header("Authorization") token: String,
        @Path("id") propertyId: String
    ): Response<Property>
    
    @POST("api/properties")
    suspend fun createProperty(
        @Header("Authorization") token: String,
        @Body property: CreatePropertyRequest
    ): Response<Property>
    
    @PUT("api/properties/{id}")
    suspend fun updateProperty(
        @Header("Authorization") token: String,
        @Path("id") propertyId: String,
        @Body property: UpdatePropertyRequest
    ): Response<Property>
    
    @DELETE("api/properties/{id}")
    suspend fun deleteProperty(
        @Header("Authorization") token: String,
        @Path("id") propertyId: String
    ): Response<Unit>
    
    // Work Orders
    @GET("api/work-orders")
    suspend fun getWorkOrders(
        @Header("Authorization") token: String,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20,
        @Query("status") status: String? = null,
        @Query("priority") priority: String? = null,
        @Query("propertyId") propertyId: String? = null
    ): Response<WorkOrdersResponse>
    
    @GET("api/work-orders/{id}")
    suspend fun getWorkOrderDetails(
        @Header("Authorization") token: String,
        @Path("id") workOrderId: String
    ): Response<WorkOrder>
    
    @POST("api/work-orders")
    suspend fun createWorkOrder(
        @Header("Authorization") token: String,
        @Body workOrder: CreateWorkOrderRequest
    ): Response<WorkOrder>
    
    @PUT("api/work-orders/{id}")
    suspend fun updateWorkOrder(
        @Header("Authorization") token: String,
        @Path("id") workOrderId: String,
        @Body update: UpdateWorkOrderRequest
    ): Response<WorkOrder>
    
    @POST("api/work-orders/{id}/assign")
    suspend fun assignWorkOrder(
        @Header("Authorization") token: String,
        @Path("id") workOrderId: String,
        @Body assignment: AssignWorkOrderRequest
    ): Response<WorkOrder>
    
    @POST("api/work-orders/{id}/complete")
    suspend fun completeWorkOrder(
        @Header("Authorization") token: String,
        @Path("id") workOrderId: String,
        @Body completion: CompleteWorkOrderRequest
    ): Response<WorkOrder>
    
    // Finance
    @GET("api/finance/invoices")
    suspend fun getInvoices(
        @Header("Authorization") token: String,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20,
        @Query("status") status: String? = null,
        @Query("propertyId") propertyId: String? = null
    ): Response<InvoicesResponse>
    
    @GET("api/finance/invoices/{id}")
    suspend fun getInvoiceDetails(
        @Header("Authorization") token: String,
        @Path("id") invoiceId: String
    ): Response<Invoice>
    
    @POST("api/finance/invoices")
    suspend fun createInvoice(
        @Header("Authorization") token: String,
        @Body invoice: CreateInvoiceRequest
    ): Response<Invoice>
    
    @POST("api/finance/payments")
    suspend fun processPayment(
        @Header("Authorization") token: String,
        @Body payment: ProcessPaymentRequest
    ): Response<PaymentResponse>
    
    // Support
    @GET("api/support/tickets")
    suspend fun getSupportTickets(
        @Header("Authorization") token: String,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20,
        @Query("status") status: String? = null
    ): Response<SupportTicketsResponse>
    
    @GET("api/support/tickets/{id}")
    suspend fun getTicketDetails(
        @Header("Authorization") token: String,
        @Path("id") ticketId: String
    ): Response<SupportTicket>
    
    @POST("api/support/tickets")
    suspend fun createSupportTicket(
        @Header("Authorization") token: String,
        @Body ticket: CreateTicketRequest
    ): Response<SupportTicket>
    
    @POST("api/support/tickets/{id}/messages")
    suspend fun addTicketMessage(
        @Header("Authorization") token: String,
        @Path("id") ticketId: String,
        @Body message: AddMessageRequest
    ): Response<TicketMessage>
    
    // Notifications
    @GET("api/notifications")
    suspend fun getNotifications(
        @Header("Authorization") token: String,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20,
        @Query("unread") unreadOnly: Boolean = false
    ): Response<NotificationsResponse>
    
    @PUT("api/notifications/{id}/read")
    suspend fun markNotificationRead(
        @Header("Authorization") token: String,
        @Path("id") notificationId: String
    ): Response<Unit>
    
    @PUT("api/notifications/read-all")
    suspend fun markAllNotificationsRead(
        @Header("Authorization") token: String
    ): Response<Unit>
    
    // IoT
    @GET("api/iot/devices")
    suspend fun getIoTDevices(
        @Header("Authorization") token: String,
        @Query("propertyId") propertyId: String? = null
    ): Response<IoTDevicesResponse>
    
    @GET("api/iot/readings")
    suspend fun getSensorReadings(
        @Header("Authorization") token: String,
        @Query("deviceId") deviceId: String? = null,
        @Query("type") type: String? = null,
        @Query("from") from: String? = null,
        @Query("to") to: String? = null
    ): Response<SensorReadingsResponse>
    
    @POST("api/iot/automation")
    suspend fun createAutomationRule(
        @Header("Authorization") token: String,
        @Body rule: CreateAutomationRuleRequest
    ): Response<AutomationRule>
    
    // Reports
    @GET("api/reports/property/{id}")
    suspend fun getPropertyReport(
        @Header("Authorization") token: String,
        @Path("id") propertyId: String,
        @Query("from") from: String,
        @Query("to") to: String
    ): Response<PropertyReport>
    
    @GET("api/reports/maintenance")
    suspend fun getMaintenanceReport(
        @Header("Authorization") token: String,
        @Query("from") from: String,
        @Query("to") to: String
    ): Response<MaintenanceReport>
    
    @GET("api/reports/financial")
    suspend fun getFinancialReport(
        @Header("Authorization") token: String,
        @Query("from") from: String,
        @Query("to") to: String
    ): Response<FinancialReport>
    
    // File Upload
    @Multipart
    @POST("api/upload")
    suspend fun uploadFile(
        @Header("Authorization") token: String,
        @Part file: MultipartBody.Part,
        @Part("type") type: RequestBody
    ): Response<FileUploadResponse>
}