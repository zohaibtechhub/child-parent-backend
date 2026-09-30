const { getParentChildren, MAX_CHILDREN_PER_PARENT } = require('../utils/children');
const { generate } = require('./pairController');

const list = async (req, res) => {
  try {
    const children = await getParentChildren(req.user.uid);
    return res.json({
      count: children.length,
      maxChildren: MAX_CHILDREN_PER_PARENT,
      children,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch children.', detail: err.message });
  }
};

const invite = async (req, res) => generate(req, res);

module.exports = { list, invite };
