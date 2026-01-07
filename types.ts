export interface BellowsPart {
  part_number: string;
  pipe_size: number;
  bellows_id_in: number;
  bellows_od_in: number;
  live_length_ll_in: number;
  overall_length_oal_in: number;
  axial_spring_rate_lbf_in: string;
  lateral_spring_rate_lbf_in: string;
  angular_spring_rate_ft_lbs_deg: string;
  axial_movement_in: number;
  lateral_movement_in: number;
  angular_movement_deg: number;
  max_allowable_pressure_psig: number;
  bellows_material: string;
  bellows_material_grade: string;
  pressure_psig: string;
  temperature_f: string;
  number_of_cycles: string;
  cycles_format: string;
  number_of_plys: string;
  weld_neck_material: string;
  weld_neck_grade: string;
  image_url?: string;
}

export enum CuffEndType {
  STANDARD_I = "STANDARD I CUFF ENDS",
  S_CUFF = "S CUFF ENDS",
  T_CUFF = "T CUFF ENDS",
  U_CUFF = "U CUFF ENDS",
  V_CUFF = "V CUFF ENDS",
  NO_CUFF_CREST = "BELLOWS WITHOUT CUFF ENDS CUT AT CREST",
  NO_CUFF_ROOT = "BELLOWS WITHOUT CUFF ENDS CUT AT ROOT",
  TRUNCATED = "TRUNCATTED CONVOLUTIONS"
}