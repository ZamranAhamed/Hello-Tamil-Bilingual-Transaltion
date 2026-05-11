import React from "react";
import { View, Text, Image, StyleSheet, ScrollView, Pressable, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";

const { width, height } = Dimensions.get("window");

export default function MainHome() {

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#FFE0B2", "#FFF9E6", "#FFF9E6", "#FFE0B2"]}
        style={StyleSheet.absoluteFillObject}
      />
      
      {/* Decorative Background Elements */}
      <View style={[styles.circle, styles.circleTopRight]} />
      <View style={[styles.circle, styles.circleBottomLeft]} />
      <View style={[styles.circleSmall, styles.circleCenter]} />

      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {/* Banner */}
          <Image
            source={require("../assets/images/hello_tamil_banner.png")}
            style={styles.banner}
            resizeMode="contain"
          />

          <Text style={styles.subtitle}>
            Fun Tamil Learning for Kids 🌟
          </Text>

          {/* Module Cards */}
          <View style={styles.cardContainer}>
            <ModuleCard
              title="Letter Identification"
              imageSource={require("../assets/images/Home_letter_identification.png")}
              href="/modules/letter_identification"
              gradientColors={["#FF9A9E", "#FECFEF"]}
            />
            <ModuleCard
              title="Writing Training"
              imageSource={require("../assets/images/Home_word_writing.png")}
              href="/modules/writing_training"
              gradientColors={["#a18cd1", "#fbc2eb"]}
            />
            <ModuleCard
              title="Speech Training"
              imageSource={require("../assets/images/Home_speech_training.png")}
              href="/modules/speech_training"
              gradientColors={["#84fab0", "#8fd3f4"]}
            />
            <ModuleCard
              title="Bilingual Translation"
              imageSource={require("../assets/images/Home_word_translation.png")}
              href="/modules/bilingual_translation"
              gradientColors={["#fccb90", "#d57eeb"]}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function ModuleCard({ title, imageSource, href, gradientColors }: any) {
  return (
    <Link href={href} asChild>
      <Pressable>
        {({ pressed }) => (
          <View style={[styles.card, pressed && styles.cardPressed]}>
            <LinearGradient
              colors={gradientColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.imageContainer}
            >
              <Image source={imageSource} style={styles.cardImage} resizeMode="contain" />
            </LinearGradient>
            <View style={styles.textContainer}>
              <Text style={styles.cardText}>{title}</Text>
              <Text style={styles.cardSubText}>Explore module 🚀</Text>
            </View>
          </View>
        )}
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF9E6",
  },
  circle: {
    position: "absolute",
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: width * 0.4,
    backgroundColor: "rgba(255, 171, 145, 0.2)",
  },
  circleTopRight: {
    top: -width * 0.2,
    right: -width * 0.2,
  },
  circleBottomLeft: {
    bottom: -width * 0.2,
    left: -width * 0.2,
    backgroundColor: "rgba(129, 212, 250, 0.2)",
  },
  circleSmall: {
    position: "absolute",
    width: width * 0.4,
    height: width * 0.4,
    borderRadius: width * 0.2,
    backgroundColor: "rgba(206, 147, 216, 0.2)",
  },
  circleCenter: {
    top: height * 0.4,
    left: width * 0.6,
  },
  banner: {
    width: "100%",
    height: 180,
    marginTop: 10,
  },
  subtitle: {
    textAlign: "center",
    fontSize: 18,
    marginVertical: 15,
    color: "#D35400",
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  cardContainer: {
    marginTop: 10,
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    padding: 14,
    borderRadius: 24,
    marginBottom: 18,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#FF8A65",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.8)",
  },
  cardPressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.9,
  },
  imageContainer: {
    width: 85,
    height: 85,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  cardImage: {
    width: "100%",
    height: "100%",
  },
  textContainer: {
    flex: 1,
    marginLeft: 18,
  },
  cardText: {
    fontSize: 19,
    fontWeight: "800",
    color: "#2C3E50",
    marginBottom: 6,
  },
  cardSubText: {
    fontSize: 14,
    color: "#7F8C8D",
    fontWeight: "600",
  },
});