# ICMR-NIN 2020 Pediatric Nutritional Standards & BMI-Calorie Reference Dataset

**Dataset File**: [`icmr_bmi_calorie_dataset.csv`](file:///c:/Users/Bhagesh%20T/OneDrive/Desktop/yella%20one%20shot/IDP%206TH%20SEM/icmr_bmi_calorie_dataset.csv)  
**Standard Authority**: Indian Council of Medical Research (ICMR) – National Institute of Nutrition (NIN) 2020 RDA Standards & WHO 5–19 Growth Reference  
**Mid-Day Meal Standard**: Ministry of Education, PM POSHAN Mandated Nutritional Allocations  

---

## 1. Dataset Column Definitions

| Column Name | Unit / Type | Description |
| :--- | :--- | :--- |
| `age_years` | Years (Integer) | Child age from 6 to 18 years |
| `gender` | Male / Female | Biological sex for pediatric metabolic calculations |
| `reference_weight_kg` | Kilograms (kg) | ICMR-NIN reference standard body weight for Indian children |
| `reference_height_cm` | Centimeters (cm) | ICMR-NIN reference standard height |
| `who_bmi_sd_minus2_thinness` | $kg/m^2$ | WHO -2 Standard Deviation (Cutoff below which a child is considered Thin/Underweight) |
| `who_bmi_median_normal` | $kg/m^2$ | WHO 50th percentile (Median ideal pediatric BMI) |
| `who_bmi_sd_plus1_overweight` | $kg/m^2$ | WHO +1 Standard Deviation (Cutoff above which a child is considered Overweight) |
| `who_bmi_sd_plus2_obesity` | $kg/m^2$ | WHO +2 Standard Deviation (Cutoff for Childhood Obesity) |
| `normal_bmi_range` | $kg/m^2$ | Verified healthy growth range between -2 SD and +1 SD |
| `icmr_full_day_calories_kcal` | kcal / day | Mandated 24-hour statutory energy intake (Estimated Energy Requirement - EER) |
| `icmr_full_day_protein_g` | g / day | Recommended Daily Allowance for protein |
| `icmr_daily_calcium_mg` | mg / day | Recommended daily dietary calcium allowance |
| `icmr_daily_iron_mg` | mg / day | Recommended daily dietary iron allowance |
| `pm_poshan_school_calories_kcal` | kcal / meal | Statutory Mid-Day Meal energy allocation delivered during school hours |
| `pm_poshan_school_protein_g` | g / meal | Statutory Mid-Day Meal protein allocation |
| `pm_poshan_stage` | Category | PM POSHAN Educational Stage (Primary vs Upper Primary) |
| `category_guideline` | Text | Clinical screening guideline based on WHO BMI cutoffs |

---

## 2. Complete ICMR Pediatric BMI & Calorie Master Table

### A. Primary School Stage (Ages 6 to 10 Years — Classes I to V)
*PM POSHAN Mandate: 450 kcal Energy & 12g Protein per school meal*

| Age | Gender | Ref Weight | Normal BMI Range | Full Day ICMR Cal | Full Day Protein | School Calorie (PM POSHAN) | School Protein |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **6** | Male | 20.2 kg | **13.0 – 16.8** | 1,500 kcal | 18.0 g | 450 kcal | 12.0 g |
| **6** | Female | 19.8 kg | **12.7 – 16.9** | 1,500 kcal | 18.0 g | 450 kcal | 12.0 g |
| **7** | Male | 22.4 kg | **13.1 – 17.2** | 1,500 kcal | 18.0 g | 450 kcal | 12.0 g |
| **7** | Female | 22.0 kg | **12.9 – 17.4** | 1,500 kcal | 18.0 g | 450 kcal | 12.0 g |
| **8** | Male | 25.0 kg | **13.3 – 17.7** | 1,500 kcal | 18.0 g | 450 kcal | 12.0 g |
| **8** | Female | 24.6 kg | **13.1 – 17.9** | 1,500 kcal | 18.0 g | 450 kcal | 12.0 g |
| **9** | Male | 28.1 kg | **13.6 – 18.3** | 1,500 kcal | 18.0 g | 450 kcal | 12.0 g |
| **9** | Female | 28.2 kg | **13.5 – 18.6** | 1,500 kcal | 18.0 g | 450 kcal | 12.0 g |
| **10** | Male | 31.4 kg | **14.0 – 19.0** | 2,220 kcal | 32.0 g | 450 kcal | 12.0 g |
| **10** | Female | 31.9 kg | **13.9 – 19.3** | 2,060 kcal | 33.0 g | 450 kcal | 12.0 g |

---

### B. Upper Primary Stage (Ages 11 to 14 Years — Classes VI to VIII)
*PM POSHAN Mandate: 700 kcal Energy & 20g Protein per school meal*

| Age | Gender | Ref Weight | Normal BMI Range | Full Day ICMR Cal | Full Day Protein | School Calorie (PM POSHAN) | School Protein |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **11** | Male | 35.3 kg | **14.5 – 19.9** | 2,220 kcal | 32.0 g | 700 kcal | 20.0 g |
| **11** | Female | 36.3 kg | **14.4 – 20.2** | 2,060 kcal | 33.0 g | 700 kcal | 20.0 g |
| **12** | Male | 39.8 kg | **15.0 – 20.8** | 2,220 kcal | 32.0 g | 700 kcal | 20.0 g |
| **12** | Female | 41.5 kg | **14.9 – 21.3** | 2,060 kcal | 33.0 g | 700 kcal | 20.0 g |
| **13** | Male | 45.3 kg | **15.5 – 21.8** | 2,860 kcal | 45.0 g | 700 kcal | 20.0 g |
| **13** | Female | 46.7 kg | **15.4 – 22.3** | 2,400 kcal | 43.0 g | 700 kcal | 20.0 g |
| **14** | Male | 50.8 kg | **16.0 – 22.7** | 2,860 kcal | 45.0 g | 700 kcal | 20.0 g |
| **14** | Female | 50.4 kg | **16.0 – 23.3** | 2,400 kcal | 43.0 g | 700 kcal | 20.0 g |

---

### C. Secondary & Adolescent Stage (Ages 15 to 18 Years)

| Age | Gender | Ref Weight | Normal BMI Range | Full Day ICMR Cal | Full Day Protein | Institutional Norm | Institutional Protein |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **15** | Male | 56.0 kg | **16.6 – 23.6** | 2,860 kcal | 45.0 g | 700 kcal | 20.0 g |
| **15** | Female | 52.8 kg | **16.4 – 24.0** | 2,400 kcal | 43.0 g | 700 kcal | 20.0 g |
| **16** | Male | 60.5 kg | **17.1 – 24.4** | 3,320 kcal | 54.0 g | 750 kcal | 22.0 g |
| **16** | Female | 54.0 kg | **16.8 – 24.7** | 2,500 kcal | 46.0 g | 750 kcal | 22.0 g |
| **17** | Male | 64.4 kg | **17.5 – 25.0** | 3,320 kcal | 54.0 g | 750 kcal | 22.0 g |
| **17** | Female | 55.0 kg | **17.2 – 25.2** | 2,500 kcal | 46.0 g | 750 kcal | 22.0 g |
| **18** | Male | 65.0 kg | **17.8 – 25.4** | 3,320 kcal | 54.0 g | 750 kcal | 22.0 g |
| **18** | Female | 55.5 kg | **17.4 – 25.5** | 2,500 kcal | 46.0 g | 750 kcal | 22.0 g |

---

## 3. Pediatric BMI Calculation Formula & Clinical Boundaries

$$\text{BMI} = \frac{\text{Weight in kg}}{(\text{Height in meters})^2}$$

### Pediatric Screening Categories (WHO 5–19 Reference):
1. **Severe Thinness**: $\text{BMI} < -3\text{ SD}$
2. **Thinness / Underweight**: $-3\text{ SD} \le \text{BMI} < -2\text{ SD}$
3. **Normal / Healthy Growth**: $-2\text{ SD} \le \text{BMI} \le +1\text{ SD}$
4. **Overweight Risk**: $+1\text{ SD} < \text{BMI} \le +2\text{ SD}$
5. **Obesity**: $\text{BMI} > +2\text{ SD}$
