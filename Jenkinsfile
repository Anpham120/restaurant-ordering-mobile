// CI/CD for restaurant-ordering-system (Jenkins multibranch job "ordering", scans GitHub every minute).
// Branch model:  feature/* ──PR──> develop ──(automatic)──> main
//   every branch / PR : CI = backend tests (incl. prod profile on PostgreSQL) + mobile typecheck, lint, web build
//   develop           : CI + disposable STAGING: build the stack, smoke-test it, remove it (nothing stays running)
//                       + when all of that passes, PROMOTE: fast-forward main to this commit (fully automatic CD)
//   main              : CI + deploy to PRODUCTION on this server (DB backup first, automatic rollback on failure)
//   main + mobile/ changed : after the deploy, queue an Android APK build on EAS (not waited for)
//   nightly (main)    : DB backup only
// Production runs scripts/deploy.sh with the credential's .env; staging runs scripts/staging-test.sh with random secrets.
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
        // Checkout used by the disposable staging stack (its .env is generated and deleted by the script)
        STAGING_DIR = '/home/coder/ordering-staging'
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

        // Disposable staging: same compose file and Dockerfiles as production, own project/ports/empty DB/random secrets,
        // removed when the checks end (pass or fail). No credential is needed.
        stage('Staging test') {
            when {
                allOf { branch 'develop'; not { triggeredBy 'TimerTrigger' } }
            }
            steps {
                sh '''
                    docker run --rm --network host \
                      -v /var/run/docker.sock:/var/run/docker.sock \
                      -v "$STAGING_DIR:$STAGING_DIR" -w "$STAGING_DIR" \
                      -e REPO_URL -e GIT_COMMIT \
                      docker:27-cli \
                      sh -c 'apk add -q --no-cache docker-cli-compose git curl bash \
                        && git config --global --add safe.directory "$PWD" \
                        && ([ -d .git ] || git init -q) \
                        && git fetch -q "$REPO_URL" develop && git reset -q --hard "${GIT_COMMIT:-FETCH_HEAD}" \
                        && scripts/staging-test.sh; rc=$?; chown -R 1000:1000 .; exit $rc'
                '''
            }
        }

        // Continuous deployment: a develop commit that passed CI and the staging test is pushed to main, whose build
        // deploys it. Fast-forward only: if main has commits develop does not have, nothing is pushed and the build fails.
        // Uses the GitHub credential of the branch source (username + token with write access to the repository).
        stage('Promote to main') {
            when {
                allOf { branch 'develop'; not { triggeredBy 'TimerTrigger' } }
            }
            steps {
                withCredentials([usernamePassword(credentialsId: 'github-branch-source', usernameVariable: 'GH_USER', passwordVariable: 'GH_TOKEN')]) {
                    sh '''
                        set -e
                        AUTH="https://${GH_USER}:${GH_TOKEN}@github.com/Anpham120/restaurant-ordering-system.git"
                        git fetch -q "$AUTH" main
                        if ! git merge-base --is-ancestor FETCH_HEAD "$GIT_COMMIT"; then
                            echo "main has commits that develop does not have: merge main into develop first"; exit 1
                        fi
                        git push -q "$AUTH" "$GIT_COMMIT:refs/heads/main"
                        echo "main -> $GIT_COMMIT (the main build deploys it)"
                    '''
                }
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
                        notifyTelegram("✅ [ordering] Staging test đạt, đã đẩy lên main để deploy production")
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
            // String.find returns a String: a Matcher kept across pipeline steps cannot be serialized by Jenkins
            String link = out.find(/https:\/\/expo\.dev\/\S+\/builds\/\S+/) ?: 'https://expo.dev'
            notifyTelegram("📱 [ordering] Đã gửi build APK lên EAS\n" + link)
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
