// CI/CD for restaurant-ordering-system (Jenkins multibranch job "ordering", scans GitHub every minute).
//   every branch / PR : backend tests (incl. prod profile on PostgreSQL) + mobile typecheck, lint, web build
//   main              : + deploy to production on this server (DB backup first, automatic rollback on failure)
//   nightly (main)    : DB backup only
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
        // Deploy directory on the host: checkout of main + .env (written only during the deploy)
        DEPLOY_DIR = '/home/coder/ordering-deploy'
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

        stage('Deploy production') {
            when {
                allOf { branch 'main'; not { triggeredBy 'TimerTrigger' } }
            }
            steps {
                // ordering-prod-env: the whole production .env, base64 on one line (Secret text)
                withCredentials([string(credentialsId: 'ordering-prod-env', variable: 'ENV_B64')]) {
                    sh '''
                        docker run --rm --network host \
                          -v /var/run/docker.sock:/var/run/docker.sock \
                          -v "$DEPLOY_DIR:$DEPLOY_DIR" -w "$DEPLOY_DIR" -v "$BACKUP_DIR:$BACKUP_DIR" \
                          -e ENV_B64 -e BACKUP_DIR -e REPO_URL -e GIT_COMMIT \
                          docker:27-cli \
                          sh -c 'apk add -q --no-cache docker-cli-compose git curl bash \
                            && git config --global --add safe.directory "$PWD" \
                            && ([ -d .git ] || git init -q) \
                            && git fetch -q "$REPO_URL" main && git reset -q --hard "${GIT_COMMIT:-FETCH_HEAD}" \
                            && (umask 077; printf "%s" "$ENV_B64" | base64 -d > .env) \
                            && scripts/deploy.sh; rc=$?; rm -f .env; chown -R 1000:1000 . "$BACKUP_DIR"; exit $rc'
                    '''
                }
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
                if (env.BRANCH_NAME == 'main' && !currentBuild.getBuildCauses('hudson.triggers.TimerTrigger$TimerTriggerCause')) {
                    notifyTelegram("✅ [ordering] Đã deploy https://order.atlasplatform12.tech")
                }
            }
        }
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
