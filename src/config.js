//Normalized & measured from model
export const ROAD_BOUND = [.3, .565]; //in normalized coordinates in y axis
export const LRT_BOUND = [.565, .74]; //normalized, y axis
export const CROSSING_BOUND = [.38, .87]; //normalized, x axis
export const CAR_LANE_W = 486/1379;
export const CAR_LANE_E = 618/1379;
export const LRT_LANE_W = 837/1379;
export const LRT_LANE_E = 951/1379;

//Detection margins
//Un-normalized in pixel space
export const PED_MARGIN = 50; //un-normalized
export const CAR_MARGIN = 80; //un-normalized
export const LRT_MARGIN = 250; //un-normalized

//Padding
//Un-normalized in pixel space
export const CAR_PADDING = 200;
export const LRT_PADDING = 900;

//LRT
//Un-normalized in pixel space
export const LRT_LENGTH = 450;

export const BASE_SPEED = .8;