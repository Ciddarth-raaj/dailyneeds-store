import React, { useEffect, useState } from "react";
import { getAllPeople } from "../helper/people";

function usePeople() {
  const [peopleList, setPeopleList] = useState([]);

  const init = async () => {
    try {
      const data = await getAllPeople();

      if (data.code === 200) {
        setPeopleList(data.data);
      } else {
        throw data;
      }
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    init();
  }, []);

  return { peopleList, refetch: init };
}

export default usePeople;
