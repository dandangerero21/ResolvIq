# Build (Java 21 — matches pom.xml and Render)
FROM maven:3.9.9-eclipse-temurin-21-alpine AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn -B -DskipTests package

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
# Render injects PORT; application.properties uses server.port=${PORT:8080}
ENTRYPOINT ["java", "-jar", "app.jar"]
