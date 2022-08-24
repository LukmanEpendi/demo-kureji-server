import VoteEvent from "../model/voteEvent.model.js";
import Organization from "../model/organization.model.js";
import User from "../model/user.model.js";

const AddEvent = async (req, res) => {
  const { orgId } = req.params;
  const { voteTitle, candidates } = req.body;
  const isExist = await VoteEvent.findOne({ voteTitle });
  if (isExist) return res.send("udah ada");

  Organization.findById(orgId)
    .then((data) => {
      if (!data)
        return res
          .status(404)
          .json({ status: "error", msg: "Organization cannot be found" });
      return data;
    }) // check if organization exists
    .then(async (data) => {
      const registeredVoters = data.members.map((v, i) => {
        return { voter: v };
      });
      const addEvent = new VoteEvent({
        voteTitle,
        candidates,
        registeredVoters,
        holder: orgId,
      });
      return addEvent.save();
    }) // create new voteEvent instance and save
    .then((result) => {
      return Organization.findByIdAndUpdate(
        orgId,
        {
          $addToSet: { voteEvents: result.id },
        },
        { new: true }
      );
    }) // findOneandupdate, insert voteEvent to organization
    .then((result) => {
      return res.status(200).json({
        status: "success",
        result,
      });
    }) // retuern result output */
    .catch((err) => res.send(err.message)); // handle error
};

const GetEvent = async (req, res) => {
  const { eventId } = req.params;

  VoteEvent.findById(eventId)
    .populate(
      "registeredVoters.voter holder",
      "voteTitle isActive candidates registeredVoters voter _id email name organization"
    )
    .then((result) => {
      res.status(200).send(result);
    })
    .catch((e) =>
      res.status(500).send({
        status: "error",
        msg: e,
      })
    );
};

const EditEvent = async (req, res) => {
  // not resolved yet
  const { eventId } = req.params;

  const { candidates, registeredVoters, isActive } = req.body;

  const emailArr = registeredVoters.map((v) => {
    return v.voter;
  });
  User.find({ email: { $in: emailArr } })
    .then((ress) => {
      if (!ress)
        return res.json({
          status: "not found",
          msg: "data cannot be found",
        });

      const data = ress.map((v) => {
        return { voter: v._id.toString() };
      });

      const update = {
        $set: {
          isActive,
          candidates: [...candidates],
          registeredVoters: [...data],
        },
      };
      const opt = { new: true };

      return VoteEvent.findByIdAndUpdate(eventId, update, opt);
    })
    .then((results) => {
      return res.status(200).json({
        status: "success",
        results,
      });
    })
    .catch((err) => {
      res.status(500).json({ status: "error", msg: err });
    });
};

const HandleVote = async (req, res) => {
  const { eventId, candidateId } = req.params;

  const payload = req.user;

  const update = {
    $inc: {
      "candidates.$[elem].numOfVotes": 1,
    },
    $set: {
      "registeredVoters.$[voter].hasVoted": true,
    },
  };
  const opt = {
    arrayFilters: [
      {
        "elem.person": candidateId,
      },
      {
        "voter.voter": payload.id,
      },
    ],
    new: true,
  };

  VoteEvent.findByIdAndUpdate(eventId, update, opt)
    .then((result) => {
      return res.status(200).json({
        status: "success",
        result,
      });
    })
    .catch((err) => {
      return res.status(500).json({
        status: "error",
        msg: err,
      });
    });
};

export { AddEvent, GetEvent, EditEvent, HandleVote };
