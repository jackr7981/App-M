#!/bin/bash

# Set JAVA_HOME to Android Studio's embedded JDK
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"

# Check if JAVA_HOME exists
if [ ! -d "$JAVA_HOME" ]; then
    echo "Error: Android Studio JDK not found at $JAVA_HOME"
    echo "Please install Android Studio or set JAVA_HOME manually."
    exit 1
fi

echo "Using JAVA_HOME: $JAVA_HOME"

# Run Capacitor Android Build
echo "🚀 Building and Running Android App..."
npx cap run android
