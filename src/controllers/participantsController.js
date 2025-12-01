// Placeholder controller for Participants
// Replace with real DB/ORM logic (Knex/Sequelize/Mongoose)

exports.list = async (req, res) => {
  // TODO: load participants from DB
  res.render("participants/list", { title: "Participants" });
};

exports.show = async (req, res) => {
  // TODO: load single participant
  res.render("participants/show", { id: req.params.id });
};

exports.newForm = (req, res) => {
  res.render("participants/new");
};

exports.create = async (req, res) => {
  // TODO: insert participant
  res.redirect("/participants");
};

exports.edit = async (req, res) => {
  // TODO: load and render edit form
  res.render("participants/edit", { id: req.params.id });
};

exports.update = async (req, res) => {
  // TODO: update participant
  res.redirect("/participants/" + req.params.id);
};

exports.delete = async (req, res) => {
  // TODO: delete participant
  res.redirect("/participants");
};
