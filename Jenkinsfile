// CI/CD for restaurant-ordering-system (Jenkins multibranch job "ordering", scans GitHub every minute).
// Branch model:  feature/* ──PR──> develop ──PR──> main
//   every branch / PR : CI = backend tests (incl. prod profile on PostgreSQL) + mobile typecheck, lint, web build
//   develop           : CI + deploy to STAGING on this server (disposable data, no public domain)
//   main              : CI + deploy to PRODUCTION on this server (DB backup first, automatic rollback on failure)
//   main + mobile/ changed : after the deploy, queue an Android APK build on EAS (not waited for)
//   nightly (main)    : DB backup only
// Both deploys run the same scripts/deploy.sh; the stack is chosen by the credential (its .env) and the directory.
// Maven and Node run in throwaway containers that share the Jenkins volume, so $WORKSPACE paths match.

pipeline {
    agent any

    options {
        disableConcurrentBuilds()
        timestamps()
        timeout(time: 40, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '20'))
    }

    triggers {
        cron(env.BRANCH_NAME == 'main' ? 'H 3 * * *' : '')
    }

    environment {
        JENKINS_CONTAINER = 'jenkins'
        REPO_URL = 'https://github.com/Anpham120/restaurant-ordering-system.git'
        // Deploy directories on the host: checkout of the branch + .env (written only during the deploy)
        DEPLOY_DIR = '/home/coder/ordering-deploy'          // production = main
        STAGING_DIR = '/home/coder/ordering-staging'        // staging = develop
        BACKUP_DIR = '/home/coder/ordering-backups'
        TELEGRAM_CHAT_ID = '6822487436'
    }

    stages {
        stage('Test backend') {
            when { not { triggeredBy 'TimerTrigger' } }
            steps {
                sh '''
                    docker run --rm -v ordering-m2-cache:/m2 alpine:3.20 chown "$(id -u):$(id -g)" /m2
                    # non-root user: embedded PostgreSQL (PostgresProdProfileTest) refuses to run as root
                    docker run --rm \
                      --volumes-from "$JENKINS_CONTAINER" -w "$WORKSPACE/backend" \
                      --user "$(id -u):$(id -g)" -e HOME=/tmp -v ordering-m2-cache:/tmp/.m2 \
                      maven:3.9-eclipse-temurin-21 \
                      mvn -B -Dmaven.repo.local=/tmp/.m2/repository verify
                '''
            }
            post {
                always { junit allowEmptyResults: true, testResults: 'backend/target/surefire-reports/*.xml' }
            }
        }

        stage('Test mobile') {
            when { not { triggeredBy 'TimerTrigger' } }
            steps {
                sh '''
                    docker run --rm --volumes-from "$JENKINS_CONTAINER" -w "$WORKSPACE/mobile" \
                      --user "$(id -u):$(id -g)" -e HOME=/tmp -e CI=1 \
                      -e EXPO_PUBLIC_API_URL=https://order.atlasplatform12.tech \
                      node:22-alpine \
                      sh -c "npm ci --no-audit --no-fund && npx tsc --noEmit && npx expo lint && npx expo export --platform web"
                '''
            }
        }

        stage('Deploy staging') {
            when {
                allOf { branch 'develop'; not { triggeredBy 'TimerTrigger' } }
            }
            steps {
                // ordering-staging-env: the whole staging .env, base64 on one line (Secret text)
                deployStack(env.STAGING_DIR, 'ordering-staging-env', 'develop')
            }
        }

        stage('Deploy production') {
            when {
                allOf { branch 'main'; not { triggeredBy 'TimerTrigger' } }
            }
            steps {
                // ordering-prod-env: the whole production .env, base64 on one line (Secret text)
                deployStack(env.DEPLOY_DIR, 'ordering-prod-env', 'main')
            }
        }

        // APK only when the app itself changed: backend-only releases do not need a new APK (it just calls the API),
        // and the free EAS plan has a monthly build quota. Needs the Jenkins credential "expo-token" (Secret text).
        stage('Build Android APK') {
            when {
                allOf { branch 'main'; not { triggeredBy 'TimerTrigger' }; changeset 'mobile/**' }
            }
            steps {
                script { queueApkBuild() }
            }
        }

        stage('Nightly DB backup') {
            when {
                allOf { branch 'main'; triggeredBy 'TimerTrigger' }
            }
            steps {
                withCredentials([string(credentialsId: 'ordering-prod-env', variable: 'ENV_B64')]) {
                    sh '''
                        docker run --rm \
                          -v /var/run/docker.sock:/var/run/docker.sock \
                          -v "$DEPLOY_DIR:$DEPLOY_DIR" -w "$DEPLOY_DIR" -v "$BACKUP_DIR:$BACKUP_DIR" \
                          -e ENV_B64 -e BACKUP_DIR \
                          docker:27-cli \
                          sh -c 'apk add -q --no-cache docker-cli-compose bash \
                            && (umask 077; printf "%s" "$ENV_B64" | base64 -d > .env) \
                            && scripts/backup-db.sh nightly; rc=$?; rm -f .env; chown -R 1000:1000 "$BACKUP_DIR"; exit $rc'
                    '''
                }
            }
        }
    }

    post {
        failure {
            script { notifyTelegram("❌ [ordering] ${env.BRANCH_NAME} #${env.BUILD_NUMBER} THẤT BẠI") }
        }
        success {
            script {
                if (!currentBuild.getBuildCauses('hudson.triggers.TimerTrigger$TimerTriggerCause')) {
                    if (env.BRANCH_NAME == 'main') {
                        notifyTelegram("✅ [ordering] Đã deploy PRODUCTION https://order.atlasplatform12.tech")
                    } else if (env.BRANCH_NAME == 'develop') {
                        notifyTelegram("✅ [ordering] Đã deploy STAGING (127.0.0.1:8185)")
                    }
                }
            }
        }
    }
}

// Deploy one stack: check out `branch` into `dir`, write .env from the credential only for the duration of
// scripts/deploy.sh (DB backup -> build -> health check -> rollback on failure).
def deployStack(String dir, String credId, String branch) {
    withCredentials([string(credentialsId: credId, variable: 'ENV_B64')]) {
        withEnv(["TARGET_DIR=${dir}", "TARGET_BRANCH=${branch}"]) {
            sh '''
                docker run --rm --network host \
                  -v /var/run/docker.sock:/var/run/docker.sock \
                  -v "$TARGET_DIR:$TARGET_DIR" -w "$TARGET_DIR" -v "$BACKUP_DIR:$BACKUP_DIR" \
                  -e ENV_B64 -e BACKUP_DIR -e REPO_URL -e GIT_COMMIT -e TARGET_BRANCH \
                  docker:27-cli \
                  sh -c 'apk add -q --no-cache docker-cli-compose git curl bash \
                    && git config --global --add safe.directory "$PWD" \
                    && ([ -d .git ] || git init -q) \
                    && git fetch -q "$REPO_URL" "$TARGET_BRANCH" && git reset -q --hard "${GIT_COMMIT:-FETCH_HEAD}" \
                    && (umask 077; printf "%s" "$ENV_B64" | base64 -d > .env) \
                    && scripts/deploy.sh; rc=$?; rm -f .env; chown -R 1000:1000 . "$BACKUP_DIR"; exit $rc'
            '''
        }
    }
}

// Queue an EAS build (profile "preview" in mobile/eas.json) and report the link. The deploy has already succeeded,
// so a failure here only sends a Telegram warning instead of failing the pipeline.
def queueApkBuild() {
    try {
        withCredentials([string(credentialsId: 'expo-token', variable: 'EXPO_TOKEN')]) {
            def out = sh(returnStdout: true, script: '''
                docker run --rm --volumes-from "$JENKINS_CONTAINER" -w "$WORKSPACE/mobile" \
                  --user "$(id -u):$(id -g)" -e HOME=/tmp -e CI=1 -e EXPO_TOKEN \
                  node:22 \
                  sh -c 'git config --global --add safe.directory "$WORKSPACE" \
                    && npx --yes eas-cli@latest build -p android --profile preview --non-interactive --no-wait 2>&1'
            ''')
            echo out
            def m = (out =~ /https:\/\/expo\.dev\/\S+\/builds\/\S+/)
            notifyTelegram("📱 [ordering] Đã gửi build APK lên EAS\n" + (m.find() ? m.group(0) : 'https://expo.dev'))
        }
    } catch (err) {
        echo "Build APK lỗi: ${err.message}"
        notifyTelegram("⚠️ [ordering] Không gửi được build APK (xem log Jenkins). Production vẫn đã deploy.")
    }
}

// Telegram message with commit and build link. A missing credential or network error only logs.
def notifyTelegram(String title) {
    try {
        def commit = sh(script: 'git log -1 --format="%h %s"', returnStdout: true).trim()
        withCredentials([string(credentialsId: 'telegram-bot-token', variable: 'TG_TOKEN')]) {
            withEnv(["TG_TEXT=${title}\n${commit}\n${env.BUILD_URL}console"]) {
                sh '''curl -fsS -o /dev/null --max-time 10 "https://api.telegram.org/bot$TG_TOKEN/sendMessage" \
                      --data-urlencode chat_id="$TELEGRAM_CHAT_ID" --data-urlencode text="$TG_TEXT"'''
            }
        }
    } catch (err) {
        echo "Không gửi được Telegram: ${err.message}"
    }
}
