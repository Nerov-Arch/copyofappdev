import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { User, Target, Heart, MapPin } from 'lucide-react-native';
import {
  generateWorkoutPlan,
  generateDietPlan,
  generateSleepSchedule,
  generateDailyTasks,
} from '@/lib/fitnessEngine';

export default function OnboardingScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [age, setAge] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [targetWeight, setTargetWeight] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('other');

  const [goals, setGoals] = useState<string[]>([]);
  const [conditions, setConditions] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);

  const goalOptions = [
    { value: 'weight_loss', label: 'Weight Loss' },
    { value: 'muscle_gain', label: 'Muscle Gain' },
    { value: 'both', label: 'Both' },
  ];

  const conditionOptions = [
    { value: 'none', label: 'None' },
    { value: 'asthma', label: 'Asthma' },
    { value: 'diabetes', label: 'Diabetes' },
    { value: 'heart_condition', label: 'Heart Condition' },
  ];

  const locationOptions = [
    { value: 'gym', label: 'Gym' },
    { value: 'home', label: 'Home' },
    { value: 'outdoors', label: 'Outdoors' },
  ];

  const toggleSelection = (
    value: string,
    current: string[],
    setter: (val: string[]) => void
  ) => {
    if (current.includes(value)) {
      setter(current.filter((v) => v !== value));
    } else {
      setter([...current, value]);
    }
  };

  const handleComplete = async () => {
    if (!user) {
      Alert.alert('Error', 'User session not found. Please sign in again.');
      return;
    }

    if (
      !age ||
      !height ||
      !weight ||
      !targetWeight ||
      goals.length === 0 ||
      conditions.length === 0 ||
      locations.length === 0
    ) {
      Alert.alert('Error', 'Please complete all fields');
      return;
    }

    setLoading(true);
    try {
      const profile = {
        age: parseInt(age),
        height: parseFloat(height),
        current_weight: parseFloat(weight),
        target_weight: parseFloat(targetWeight),
        gender,
        profile_completed: true,
      };

      // Use upsert to create or update the profile (handles missing row / UUID PK)
      const profileResult = await supabase
        .from('user_profiles')
        .upsert({ id: user!.id, email: user!.email, ...profile });
      console.log('Onboarding profile upsert result:', profileResult);
      if (profileResult.error) throw profileResult.error;

      for (const goal of goals) {
        const goalResult = await supabase.from('user_goals').insert({
          user_id: user!.id,
          goal_type: goal,
          is_active: true,
        });
        console.log('Inserted goal result:', goalResult);
        if (goalResult.error) throw goalResult.error;
      }

      for (const condition of conditions) {
        const condResult = await supabase.from('user_medical_conditions').insert({
          user_id: user!.id,
          condition,
        });
        console.log('Inserted condition result:', condResult);
        if (condResult.error) throw condResult.error;
      }

      for (const location of locations) {
        const locResult = await supabase.from('user_exercise_locations').insert({
          user_id: user!.id,
          location,
        });
        console.log('Inserted location result:', locResult);
        if (locResult.error) throw locResult.error;
      }

      const goalsData = goals.map((g) => ({ goal_type: g as any }));
      const conditionsData = conditions.map((c) => ({ condition: c }));
      const locationsData = locations.map((l) => ({ location: l as any }));

      const workouts = generateWorkoutPlan(
        profile,
        goalsData,
        conditionsData,
        locationsData
      );

      for (const workout of workouts) {
        await supabase.from('workout_plans').insert({
          user_id: user!.id,
          ...workout,
        });
      }

      const meals = generateDietPlan(profile, goalsData);

      for (const meal of meals) {
        await supabase.from('diet_plans').insert({
          user_id: user!.id,
          ...meal,
        });
      }

      const sleep = generateSleepSchedule(goalsData);
      await supabase.from('sleep_schedules').insert({
        user_id: user!.id,
        ...sleep,
      });

      const todayTasks = generateDailyTasks(workouts, meals, sleep);
      for (const task of todayTasks) {
        await supabase.from('daily_tasks').insert({
          user_id: user!.id,
          ...task,
        });
      }

      await supabase.from('weight_logs').insert({
        user_id: user!.id,
        weight: parseFloat(weight),
        log_date: new Date().toISOString().split('T')[0],
      });

      router.replace('/(tabs)');
    } catch (error: any) {
      console.error('Onboarding error:', error);
      Alert.alert('Error', error.message || 'Failed to complete profile setup');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Complete Your Profile</Text>
        <Text style={styles.description}>
          Set up your fitness profile to get personalized recommendations
        </Text>
      </View>

      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <View style={styles.iconContainer}>
            <User size={20} color="#2563eb" />
          </View>
          <Text style={styles.sectionTitle}>Personal Information</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Age</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your age"
            value={age}
            onChangeText={setAge}
            keyboardType="numeric"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Height (cm)</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your height"
            value={height}
            onChangeText={setHeight}
            keyboardType="numeric"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Current Weight (kg)</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your current weight"
            value={weight}
            onChangeText={setWeight}
            keyboardType="numeric"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Target Weight (kg)</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your target weight"
            value={targetWeight}
            onChangeText={setTargetWeight}
            keyboardType="numeric"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Gender</Text>
          <View style={styles.optionsRow}>
            {['male', 'female', 'other'].map((g) => (
              <TouchableOpacity
                key={g}
                style={[
                  styles.optionButton,
                  gender === g && styles.optionButtonSelected,
                ]}
                onPress={() => setGender(g as any)}
              >
                <Text
                  style={[
                    styles.optionText,
                    gender === g && styles.optionTextSelected,
                  ]}
                >
                  {g.charAt(0).toUpperCase() + g.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <View style={styles.iconContainer}>
            <Target size={20} color="#2563eb" />
          </View>
          <Text style={styles.sectionTitle}>Fitness Goals</Text>
        </View>

        <View style={styles.cardsContainer}>
          {goalOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.card,
                goals.includes(option.value) && styles.cardSelected,
              ]}
              onPress={() => {
                if (option.value === 'both') {
                  setGoals(['both']);
                } else {
                  const filtered = goals.filter((g) => g !== 'both');
                  toggleSelection(option.value, filtered, setGoals);
                }
              }}
            >
              <Text
                style={[
                  styles.cardText,
                  goals.includes(option.value) && styles.cardTextSelected,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <View style={styles.iconContainer}>
            <Heart size={20} color="#2563eb" />
          </View>
          <Text style={styles.sectionTitle}>Medical Information</Text>
        </View>

        <View style={styles.cardsContainer}>
          {conditionOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.card,
                conditions.includes(option.value) && styles.cardSelected,
              ]}
              onPress={() =>
                toggleSelection(option.value, conditions, setConditions)
              }
            >
              <Text
                style={[
                  styles.cardText,
                  conditions.includes(option.value) && styles.cardTextSelected,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <View style={styles.iconContainer}>
            <MapPin size={20} color="#2563eb" />
          </View>
          <Text style={styles.sectionTitle}>Exercise Locations</Text>
        </View>
        <Text style={styles.sectionSubtitle}>
          Select where you prefer to workout (multiple allowed)
        </Text>

        <View style={styles.cardsContainer}>
          {locationOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.card,
                locations.includes(option.value) && styles.cardSelected,
              ]}
              onPress={() => {
                toggleSelection(option.value, locations, setLocations);
              }}
            >
              <Text
                style={[
                  styles.cardText,
                  locations.includes(option.value) && styles.cardTextSelected,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TouchableOpacity
        style={[styles.submitButton, loading && styles.buttonDisabled]}
        onPress={handleComplete}
        disabled={loading}
      >
        <Text style={styles.submitButtonText}>
          {loading ? 'Setting up your profile...' : 'Complete Setup'}
        </Text>
      </TouchableOpacity>

      <View style={styles.bottomSpace} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  content: {
    padding: 20,
    paddingTop: 60,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#6b7280',
    lineHeight: 24,
  },
  sectionContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#111827',
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  optionButton: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  optionButtonSelected: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  optionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  optionTextSelected: {
    color: '#ffffff',
  },
  cardsContainer: {
    gap: 10,
  },
  card: {
    backgroundColor: '#f9fafb',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
  },
  cardSelected: {
    backgroundColor: '#dbeafe',
    borderColor: '#2563eb',
  },
  cardText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },
  cardTextSelected: {
    color: '#2563eb',
  },
  submitButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
  },
  bottomSpace: {
    height: 40,
  },
});
