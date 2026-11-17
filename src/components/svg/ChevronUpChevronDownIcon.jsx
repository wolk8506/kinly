import SvgIcon from "@mui/material/SvgIcon";

function ChevronUpChevronDownIcon(props) {
  return (
    <SvgIcon {...props} viewBox="0 0 11 15">
      <path
        d="M1.75 5.25 5.5 1.5 9.25 5.25"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M1.75 9.75 5.5 13.5 9.25 9.75"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </SvgIcon>
  );
}

export default ChevronUpChevronDownIcon;