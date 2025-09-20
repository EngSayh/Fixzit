package com.fixzit.app

import android.app.Application
import androidx.hilt.work.HiltWorkerFactory
import androidx.work.Configuration
import com.fixzit.app.data.local.DatabaseManager
import com.fixzit.app.services.NotificationService
import com.fixzit.app.utils.TimberLogger
import dagger.hilt.android.HiltAndroidApp
import timber.log.Timber
import javax.inject.Inject

@HiltAndroidApp
class FixzitApplication : Application(), Configuration.Provider {
    
    @Inject
    lateinit var workerFactory: HiltWorkerFactory
    
    @Inject
    lateinit var databaseManager: DatabaseManager
    
    @Inject
    lateinit var notificationService: NotificationService
    
    override fun onCreate() {
        super.onCreate()
        
        initializeLogging()
        initializeDatabase()
        initializeNotifications()
        initializeNetworkMonitoring()
    }
    
    private fun initializeLogging() {
        if (BuildConfig.DEBUG) {
            Timber.plant(Timber.DebugTree())
        } else {
            Timber.plant(TimberLogger())
        }
    }
    
    private fun initializeDatabase() {
        databaseManager.initialize()
    }
    
    private fun initializeNotifications() {
        notificationService.createNotificationChannels()
    }
    
    private fun initializeNetworkMonitoring() {
        // Network monitoring initialization
    }
    
    override fun getWorkManagerConfiguration(): Configuration {
        return Configuration.Builder()
            .setWorkerFactory(workerFactory)
            .build()
    }
    
    companion object {
        const val PACKAGE_NAME = "com.fixzit.app"
        const val VERSION_NAME = BuildConfig.VERSION_NAME
        const val VERSION_CODE = BuildConfig.VERSION_CODE
    }
}