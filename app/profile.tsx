import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { User, Target, Heart, MapPin, ArrowLeft, Save } from 'lucide-react-native';

interface ProfileData {
  age: number;
  height: number;
  current_weight: number;
  target_weight: number;
  gender: 'male' | 'female' | 'other';
}

export default function ProfileScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user!.id)
        .maybeSingle();

      if (profileError) throw profileError;

      if (profileData) {
        setAge(profileData.age?.toString() || '');
        setHeight(profileData.height?.toString() || '');
        setWeight(profileData.current_weight?.toString() || '');
        setTargetWeight(profileData.target_weight?.toString() || '');
        setGender(profileData.gender || 'other');
      }

      const { data: goalsData, error: goalsError } = await supabase
        .from('user_goals')
        .select('goal_type')
        .eq('user_id', user!.id)
        .eq('is_active', true);

      if (goalsError) throw goalsError;
      if (goalsData) {
        setGoals(goalsData.map((g) => g.goal_type));
      }

      const { data: conditionsData, error: conditionsError } = await supabase
        .from('user_medical_conditions')
        .select('condition')
        .eq('user_id', user!.id);

      if (conditionsError) throw conditionsError;
      if (conditionsData) {
        setConditions(conditionsData.map((c) => c.condition));
      }

      const { data: locationsData, error: locationsError } = await supabase
        .from('user_exercise_locations')
        .select('location')
        .eq('user_id', user!.id);

      if (locationsError) throw locationsError;
      if (locationsData) {
        setLocations(locationsData.map((l) => l.location));
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

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

  const handleSave = async () => {
    if (!age || !height || !weight || !targetWeight) {
      Alert.alert('Error', 'Please fill in all personal information fields');
      return;
    }

    if (goals.length === 0) {
      Alert.alert('Error', 'Please select at least one fitness goal');
      return;
    }

    if (conditions.length === 0) {
      Alert.alert('Error', 'Please select at least one medical condition option');
      return;
    }

    if (locations.length === 0) {
      Alert.alert('Error', 'Please select at least one exercise location');
      return;
    }

    setSaving(true);
    try {
      const profile = {
        age: parseInt(age),
        height: parseFloat(height),
        current_weight: parseFloat(weight),
        target_weight: parseFloat(targetWeight),
        gender,
      };

      // Use upsert to create or update the profile atomically
      const profileResult = await supabase
        .from('user_profiles')
        .upsert({ id: user!.id, email: user!.email, ...profile });

      console.log('Profile upsert result:', profileResult);

      if (profileResult.error) throw profileResult.error;

      await supabase.from('user_goals').delete().eq('user_id', user!.id);

      for (const goal of goals) {
        await supabase.from('user_goals').insert({
          user_id: user!.id,
          goal_type: goal,
          is_active: true,
        });
      }

      await supabase.from('user_medical_conditions').delete().eq('user_id', user!.id);

      for (const condition of conditions) {
        await supabase.from('user_medical_conditions').insert({
          user_id: user!.id,
          condition,
        });
      }

      await supabase.from('user_exercise_locations').delete().eq('user_id', user!.id);

      for (const location of locations) {
        await supabase.from('user_exercise_locations').insert({
          user_id: user!.id,
          location,
        });
      }

      Alert.alert('Success', 'Profile updated successfully', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error: any) {
      console.error('Profile update error:', error);
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Your Profile</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
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
          style={[styles.saveButton, saving && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Save size={20} color="#ffffff" />
          <Text style={styles.saveButtonText}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Text>
        </TouchableOpacity>

        <View style={styles.bottomSpace} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 8,
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
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
  saveButton: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
  },
  bottomSpace: {
    height: 40,
  },
});
