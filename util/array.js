export const advanceSearch = (array, searchValue) => {
  return array.filter((item) => {
    return Object.values(item).some((value) => {
      if (typeof value === "string") {
        return value.toLowerCase().includes(searchValue.toLowerCase());
      }
      return false;
    });
  });
};
